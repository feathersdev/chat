/* ES Module Shims 2.0.2 */
(function () {

  const hasDocument = typeof document !== 'undefined';

  const noop = () => {};

  const optionsScript = hasDocument ? document.querySelector('script[type=esms-options]') : undefined;

  const esmsInitOptions = optionsScript ? JSON.parse(optionsScript.innerHTML) : {};
  Object.assign(esmsInitOptions, self.esmsInitOptions || {});

  // shim mode is determined on initialization, no late shim mode
  const shimMode =
    hasDocument ?
      esmsInitOptions.shimMode ||
      document.querySelectorAll('script[type=module-shim],script[type=importmap-shim],link[rel=modulepreload-shim]')
        .length > 0
    : true;

  const importHook = globalHook(shimMode && esmsInitOptions.onimport);
  const resolveHook = globalHook(shimMode && esmsInitOptions.resolve);
  let fetchHook = esmsInitOptions.fetch ? globalHook(esmsInitOptions.fetch) : fetch;
  const metaHook = esmsInitOptions.meta ? globalHook(shimMode && esmsInitOptions.meta) : noop;
  const tsTransform = esmsInitOptions.tsTransform || document.currentScript?.src.replace('.debug.js', '-typescript.js') || './es-module-shims-typescript.js';

  const mapOverrides = esmsInitOptions.mapOverrides;

  let nonce = esmsInitOptions.nonce;
  if (!nonce && hasDocument) {
    const nonceElement = document.querySelector('script[nonce]');
    if (nonceElement) nonce = nonceElement.nonce || nonceElement.getAttribute('nonce');
  }

  const onerror = globalHook(esmsInitOptions.onerror || noop);

  const { revokeBlobURLs, noLoadEventRetriggers, enforceIntegrity } = esmsInitOptions;

  function globalHook(name) {
    return typeof name === 'string' ? self[name] : name;
  }

  const enable = Array.isArray(esmsInitOptions.polyfillEnable) ? esmsInitOptions.polyfillEnable : [];
  const enableAll = enable.includes('all');
  const cssModulesEnabled = enable.includes('css-modules') || enableAll;
  const jsonModulesEnabled = enable.includes('json-modules') || enableAll;
  const wasmModulesEnabled = enable.includes('wasm-modules') || enableAll;
  const sourcePhaseEnabled = enable.includes('source-phase') || enableAll;
  const typescriptEnabled = enable.includes('typescript') || enableAll;

  const onpolyfill =
    esmsInitOptions.onpolyfill ?
      globalHook(esmsInitOptions.onpolyfill)
    : () => {
        console.log(`%c^^ Module error above is polyfilled and can be ignored ^^`, 'font-weight:900;color:#391');
      };

  const edge = !navigator.userAgentData && !!navigator.userAgent.match(/Edge\/\d+\.\d+/);

  const baseUrl =
    hasDocument ?
      document.baseURI
    : `${location.protocol}//${location.host}${
      location.pathname.includes('/') ?
        location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1)
      : location.pathname
    }`;

  const createBlob = (source, type = 'text/javascript') => URL.createObjectURL(new Blob([source], { type }));
  let { skip } = esmsInitOptions;
  if (Array.isArray(skip)) {
    const l = skip.map(s => new URL(s, baseUrl).href);
    skip = s => l.some(i => (i[i.length - 1] === '/' && s.startsWith(i)) || s === i);
  } else if (typeof skip === 'string') {
    const r = new RegExp(skip);
    skip = s => r.test(s);
  } else if (skip instanceof RegExp) {
    skip = s => skip.test(s);
  }

  const dispatchError = error => self.dispatchEvent(Object.assign(new Event('error'), { error }));

  const throwError = err => {
    (self.reportError || dispatchError)(err), void onerror(err);
  };

  function fromParent(parent) {
    return parent ? ` imported from ${parent}` : '';
  }

  const backslashRegEx = /\\/g;

  function asURL(url) {
    try {
      if (url.indexOf(':') !== -1) return new URL(url).href;
    } catch (_) {}
  }

  function resolveUrl(relUrl, parentUrl) {
    return resolveIfNotPlainOrUrl(relUrl, parentUrl) || asURL(relUrl) || resolveIfNotPlainOrUrl('./' + relUrl, parentUrl);
  }

  function resolveIfNotPlainOrUrl(relUrl, parentUrl) {
    const hIdx = parentUrl.indexOf('#'),
      qIdx = parentUrl.indexOf('?');
    if (hIdx + qIdx > -2)
      parentUrl = parentUrl.slice(
        0,
        hIdx === -1 ? qIdx
        : qIdx === -1 || qIdx > hIdx ? hIdx
        : qIdx
      );
    if (relUrl.indexOf('\\') !== -1) relUrl = relUrl.replace(backslashRegEx, '/');
    // protocol-relative
    if (relUrl[0] === '/' && relUrl[1] === '/') {
      return parentUrl.slice(0, parentUrl.indexOf(':') + 1) + relUrl;
    }
    // relative-url
    else if (
      (relUrl[0] === '.' &&
        (relUrl[1] === '/' ||
          (relUrl[1] === '.' && (relUrl[2] === '/' || (relUrl.length === 2 && (relUrl += '/')))) ||
          (relUrl.length === 1 && (relUrl += '/')))) ||
      relUrl[0] === '/'
    ) {
      const parentProtocol = parentUrl.slice(0, parentUrl.indexOf(':') + 1);
      if (parentProtocol === 'blob:') {
        throw new TypeError(
          `Failed to resolve module specifier "${relUrl}". Invalid relative url or base scheme isn't hierarchical.`
        );
      }
      // Disabled, but these cases will give inconsistent results for deep backtracking
      //if (parentUrl[parentProtocol.length] !== '/')
      //  throw new Error('Cannot resolve');
      // read pathname from parent URL
      // pathname taken to be part after leading "/"
      let pathname;
      if (parentUrl[parentProtocol.length + 1] === '/') {
        // resolving to a :// so we need to read out the auth and host
        if (parentProtocol !== 'file:') {
          pathname = parentUrl.slice(parentProtocol.length + 2);
          pathname = pathname.slice(pathname.indexOf('/') + 1);
        } else {
          pathname = parentUrl.slice(8);
        }
      } else {
        // resolving to :/ so pathname is the /... part
        pathname = parentUrl.slice(parentProtocol.length + (parentUrl[parentProtocol.length] === '/'));
      }

      if (relUrl[0] === '/') return parentUrl.slice(0, parentUrl.length - pathname.length - 1) + relUrl;

      // join together and split for removal of .. and . segments
      // looping the string instead of anything fancy for perf reasons
      // '../../../../../z' resolved to 'x/y' is just 'z'
      const segmented = pathname.slice(0, pathname.lastIndexOf('/') + 1) + relUrl;

      const output = [];
      let segmentIndex = -1;
      for (let i = 0; i < segmented.length; i++) {
        // busy reading a segment - only terminate on '/'
        if (segmentIndex !== -1) {
          if (segmented[i] === '/') {
            output.push(segmented.slice(segmentIndex, i + 1));
            segmentIndex = -1;
          }
          continue;
        }
        // new segment - check if it is relative
        else if (segmented[i] === '.') {
          // ../ segment
          if (segmented[i + 1] === '.' && (segmented[i + 2] === '/' || i + 2 === segmented.length)) {
            output.pop();
            i += 2;
            continue;
          }
          // ./ segment
          else if (segmented[i + 1] === '/' || i + 1 === segmented.length) {
            i += 1;
            continue;
          }
        }
        // it is the start of a new segment
        while (segmented[i] === '/') i++;
        segmentIndex = i;
      }
      // finish reading out the last segment
      if (segmentIndex !== -1) output.push(segmented.slice(segmentIndex));
      return parentUrl.slice(0, parentUrl.length - pathname.length) + output.join('');
    }
  }

  function resolveAndComposeImportMap(json, baseUrl, parentMap) {
    const outMap = {
      imports: Object.assign({}, parentMap.imports),
      scopes: Object.assign({}, parentMap.scopes),
      integrity: Object.assign({}, parentMap.integrity)
    };

    if (json.imports) resolveAndComposePackages(json.imports, outMap.imports, baseUrl, parentMap);

    if (json.scopes)
      for (let s in json.scopes) {
        const resolvedScope = resolveUrl(s, baseUrl);
        resolveAndComposePackages(
          json.scopes[s],
          outMap.scopes[resolvedScope] || (outMap.scopes[resolvedScope] = {}),
          baseUrl,
          parentMap
        );
      }

    if (json.integrity) resolveAndComposeIntegrity(json.integrity, outMap.integrity, baseUrl);

    return outMap;
  }

  function getMatch(path, matchObj) {
    if (matchObj[path]) return path;
    let sepIndex = path.length;
    do {
      const segment = path.slice(0, sepIndex + 1);
      if (segment in matchObj) return segment;
    } while ((sepIndex = path.lastIndexOf('/', sepIndex - 1)) !== -1);
  }

  function applyPackages(id, packages) {
    const pkgName = getMatch(id, packages);
    if (pkgName) {
      const pkg = packages[pkgName];
      if (pkg === null) return;
      return pkg + id.slice(pkgName.length);
    }
  }

  function resolveImportMap(importMap, resolvedOrPlain, parentUrl) {
    let scopeUrl = parentUrl && getMatch(parentUrl, importMap.scopes);
    while (scopeUrl) {
      const packageResolution = applyPackages(resolvedOrPlain, importMap.scopes[scopeUrl]);
      if (packageResolution) return packageResolution;
      scopeUrl = getMatch(scopeUrl.slice(0, scopeUrl.lastIndexOf('/')), importMap.scopes);
    }
    return applyPackages(resolvedOrPlain, importMap.imports) || (resolvedOrPlain.indexOf(':') !== -1 && resolvedOrPlain);
  }

  function resolveAndComposePackages(packages, outPackages, baseUrl, parentMap) {
    for (let p in packages) {
      const resolvedLhs = resolveIfNotPlainOrUrl(p, baseUrl) || p;
      if (
        (!shimMode || !mapOverrides) &&
        outPackages[resolvedLhs] &&
        outPackages[resolvedLhs] !== packages[resolvedLhs]
      ) {
        console.warn(
          `es-module-shims: Rejected map override "${resolvedLhs}" from ${outPackages[resolvedLhs]} to ${packages[resolvedLhs]}.`
        );
        continue;
      }
      let target = packages[p];
      if (typeof target !== 'string') continue;
      const mapped = resolveImportMap(parentMap, resolveIfNotPlainOrUrl(target, baseUrl) || target, baseUrl);
      if (mapped) {
        outPackages[resolvedLhs] = mapped;
        continue;
      }
      console.warn(`es-module-shims: Mapping "${p}" -> "${packages[p]}" does not resolve`);
    }
  }

  function resolveAndComposeIntegrity(integrity, outIntegrity, baseUrl) {
    for (let p in integrity) {
      const resolvedLhs = resolveIfNotPlainOrUrl(p, baseUrl) || p;
      if (
        (!shimMode || !mapOverrides) &&
        outIntegrity[resolvedLhs] &&
        outIntegrity[resolvedLhs] !== integrity[resolvedLhs]
      ) {
        console.warn(
          `es-module-shims: Rejected map integrity override "${resolvedLhs}" from ${outIntegrity[resolvedLhs]} to ${integrity[resolvedLhs]}.`
        );
      }
      outIntegrity[resolvedLhs] = integrity[p];
    }
  }

  let dynamicImport = !hasDocument && (0, eval)('u=>import(u)');

  let supportsDynamicImport;

  const dynamicImportCheck =
    hasDocument &&
    new Promise(resolve => {
      const s = Object.assign(document.createElement('script'), {
        src: createBlob('self._d=u=>import(u)'),
        ep: true
      });
      s.setAttribute('nonce', nonce);
      s.addEventListener('load', () => {
        if (!(supportsDynamicImport = !!(dynamicImport = self._d))) {
          let err;
          window.addEventListener('error', _err => (err = _err));
          dynamicImport = (url, opts) =>
            new Promise((resolve, reject) => {
              const s = Object.assign(document.createElement('script'), {
                type: 'module',
                src: createBlob(`import*as m from'${url}';self._esmsi=m`)
              });
              err = undefined;
              s.ep = true;
              if (nonce) s.setAttribute('nonce', nonce);
              // Safari is unique in supporting module script error events
              s.addEventListener('error', cb);
              s.addEventListener('load', cb);
              function cb(_err) {
                document.head.removeChild(s);
                if (self._esmsi) {
                  resolve(self._esmsi, baseUrl);
                  self._esmsi = undefined;
                } else {
                  reject(
                    (!(_err instanceof Event) && _err) ||
                      (err && err.error) ||
                      new Error(`Error loading ${(opts && opts.errUrl) || url} (${s.src}).`)
                  );
                  err = undefined;
                }
              }
              document.head.appendChild(s);
            });
        }
        document.head.removeChild(s);
        delete self._d;
        resolve();
      });
      document.head.appendChild(s);
    });

  // support browsers without dynamic import support (eg Firefox 6x)
  let supportsJsonType = false;
  let supportsCssType = false;

  const supports = hasDocument && HTMLScriptElement.supports;

  let supportsImportMaps = supports && supports.name === 'supports' && supports('importmap');
  let supportsImportMeta = supportsDynamicImport;
  let supportsWasmModules = false;
  let supportsSourcePhase = false;
  let supportsMultipleImportMaps = false;

  const wasmBytes = [0, 97, 115, 109, 1, 0, 0, 0];

  let featureDetectionPromise = Promise.resolve(dynamicImportCheck).then(() => {
    if (!supportsDynamicImport) return;
    if (!hasDocument)
      return Promise.all([
        supportsImportMaps || dynamicImport(createBlob('import.meta')).then(() => (supportsImportMeta = true), noop),
        cssModulesEnabled &&
          dynamicImport(createBlob(`import"${createBlob('', 'text/css')}"with{type:"css"}`)).then(
            () => (supportsCssType = true),
            noop
          ),
        jsonModulesEnabled &&
          dynamicImport(createBlob(`import"${createBlob('{}', 'text/json')}"with{type:"json"}`)).then(
            () => (supportsJsonType = true),
            noop
          ),
        wasmModulesEnabled &&
          dynamicImport(createBlob(`import"${createBlob(new Uint8Array(wasmBytes), 'application/wasm')}"`)).then(
            () => (supportsWasmModules = true),
            noop
          ),
        wasmModulesEnabled &&
          sourcePhaseEnabled &&
          dynamicImport(
            createBlob(`import source x from"${createBlob(new Uint8Array(wasmBytes), 'application/wasm')}"`)
          ).then(() => (supportsSourcePhase = true), noop)
      ]);

    return new Promise(resolve => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.setAttribute('nonce', nonce);
      function cb({ data }) {
        const isFeatureDetectionMessage = Array.isArray(data) && data[0] === 'esms';
        if (!isFeatureDetectionMessage) return;
        [
          ,
          supportsImportMaps,
          supportsImportMeta,
          supportsMultipleImportMaps,
          supportsCssType,
          supportsJsonType,
          supportsWasmModules,
          supportsSourcePhase
        ] = data;
        resolve();
        document.head.removeChild(iframe);
        window.removeEventListener('message', cb, false);
      }
      window.addEventListener('message', cb, false);

      const importMapTest = `<script nonce=${nonce || ''}>b=(s,type='text/javascript')=>URL.createObjectURL(new Blob([s],{type}));i=innerText=>document.head.appendChild(Object.assign(document.createElement('script'),{type:'importmap',nonce:"${nonce}",innerText}));i(\`{"imports":{"x":"\${b('')}"}}\`);i(\`{"imports":{"y":"\${b('')}"}}\`);Promise.all([${
      supportsImportMaps ? 'true,true' : `'x',b('import.meta')`
    },'y',${cssModulesEnabled ? `b(\`import"\${b('','text/css')}"with{type:"css"}\`)` : 'false'}, ${
      jsonModulesEnabled ? `b(\`import"\${b('{}','text/json')\}"with{type:"json"}\`)` : 'false'
    },${
      wasmModulesEnabled ?
        `b(\`import"\${b(new Uint8Array(${JSON.stringify(wasmBytes)}),'application/wasm')\}"\`)`
      : 'false'
    },${
      wasmModulesEnabled && sourcePhaseEnabled ?
        `b(\`import source x from "\${b(new Uint8Array(${JSON.stringify(wasmBytes)}),'application/wasm')\}"\`)`
      : 'false'
    }].map(x =>typeof x==='string'?import(x).then(()=>true,()=>false):x)).then(a=>parent.postMessage(['esms'].concat(a),'*'))<${''}/script>`;

      // Safari will call onload eagerly on head injection, but we don't want the Wechat
      // path to trigger before setting srcdoc, therefore we track the timing
      let readyForOnload = false,
        onloadCalledWhileNotReady = false;
      function doOnload() {
        if (!readyForOnload) {
          onloadCalledWhileNotReady = true;
          return;
        }
        // WeChat browser doesn't support setting srcdoc scripts
        // But iframe sandboxes don't support contentDocument so we do this as a fallback
        const doc = iframe.contentDocument;
        if (doc && doc.head.childNodes.length === 0) {
          const s = doc.createElement('script');
          if (nonce) s.setAttribute('nonce', nonce);
          s.innerHTML = importMapTest.slice(15 + (nonce ? nonce.length : 0), -9);
          doc.head.appendChild(s);
        }
      }

      iframe.onload = doOnload;
      // WeChat browser requires append before setting srcdoc
      document.head.appendChild(iframe);

      // setting srcdoc is not supported in React native webviews on iOS
      // setting src to a blob URL results in a navigation event in webviews
      // document.write gives usability warnings
      readyForOnload = true;
      if ('srcdoc' in iframe) iframe.srcdoc = importMapTest;
      else iframe.contentDocument.write(importMapTest);
      // retrigger onload for Safari only if necessary
      if (onloadCalledWhileNotReady) doOnload();
    });
  });

  featureDetectionPromise = featureDetectionPromise.then(() => {
      console.info(
        `es-module-shims: detected native support - module types: (${[...(supportsJsonType ? ['json'] : []), ...(supportsCssType ? ['css'] : []), ...(supportsWasmModules ? 'wasm' : '')].join(', ')}), ${supportsMultipleImportMaps ? '' : 'no '}multiple import maps, ${supportsDynamicImport ? '' : 'no '}dynamic import, ${supportsImportMeta ? '' : 'no '}import meta, ${supportsImportMaps ? '' : 'no '}import maps`
      );
    });

  /* es-module-lexer 1.6.0 */
  let e,a,r,i=2<<19;const s=1===new Uint8Array(new Uint16Array([1]).buffer)[0]?function(e,a){const r=e.length;let i=0;for(;i<r;)a[i]=e.charCodeAt(i++);}:function(e,a){const r=e.length;let i=0;for(;i<r;){const r=e.charCodeAt(i);a[i++]=(255&r)<<8|r>>>8;}},f="xportmportlassforetaourceromsyncunctionssertvoyiedelecontininstantybreareturdebuggeawaithrwhileifcatcfinallels";let t$1,c$1,n;function parse(k,l="@"){t$1=k,c$1=l;const u=2*t$1.length+(2<<18);if(u>i||!e){for(;u>i;)i*=2;a=new ArrayBuffer(i),s(f,new Uint16Array(a,16,110)),e=function(e,a,r){"use asm";var i=new e.Int8Array(r),s=new e.Int16Array(r),f=new e.Int32Array(r),t=new e.Uint8Array(r),c=new e.Uint16Array(r),n=1040;function b(){var e=0,a=0,r=0,t=0,c=0,b=0,u=0;u=n;n=n+10240|0;i[804]=1;i[803]=0;s[399]=0;s[400]=0;f[69]=f[2];i[805]=0;f[68]=0;i[802]=0;f[70]=u+2048;f[71]=u;i[806]=0;e=(f[3]|0)+-2|0;f[72]=e;a=e+(f[66]<<1)|0;f[73]=a;e:while(1){r=e+2|0;f[72]=r;if(e>>>0>=a>>>0){t=18;break}a:do{switch(s[r>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if((((s[400]|0)==0?H(r)|0:0)?(m(e+4|0,16,10)|0)==0:0)?(k(),(i[804]|0)==0):0){t=9;break e}else t=17;break}case 105:{if(H(r)|0?(m(e+4|0,26,10)|0)==0:0){l();t=17;}else t=17;break}case 59:{t=17;break}case 47:switch(s[e+4>>1]|0){case 47:{P();break a}case 42:{y(1);break a}default:{t=16;break e}}default:{t=16;break e}}}while(0);if((t|0)==17){t=0;f[69]=f[72];}e=f[72]|0;a=f[73]|0;}if((t|0)==9){e=f[72]|0;f[69]=e;t=19;}else if((t|0)==16){i[804]=0;f[72]=e;t=19;}else if((t|0)==18)if(!(i[802]|0)){e=r;t=19;}else e=0;do{if((t|0)==19){e:while(1){a=e+2|0;f[72]=a;if(e>>>0>=(f[73]|0)>>>0){t=92;break}a:do{switch(s[a>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if(((s[400]|0)==0?H(a)|0:0)?(m(e+4|0,16,10)|0)==0:0){k();t=91;}else t=91;break}case 105:{if(H(a)|0?(m(e+4|0,26,10)|0)==0:0){l();t=91;}else t=91;break}case 99:{if((H(a)|0?(m(e+4|0,36,8)|0)==0:0)?V(s[e+12>>1]|0)|0:0){i[806]=1;t=91;}else t=91;break}case 40:{r=f[70]|0;e=s[400]|0;t=e&65535;f[r+(t<<3)>>2]=1;a=f[69]|0;s[400]=e+1<<16>>16;f[r+(t<<3)+4>>2]=a;t=91;break}case 41:{a=s[400]|0;if(!(a<<16>>16)){t=36;break e}r=a+-1<<16>>16;s[400]=r;t=s[399]|0;a=t&65535;if(t<<16>>16!=0?(f[(f[70]|0)+((r&65535)<<3)>>2]|0)==5:0){a=f[(f[71]|0)+(a+-1<<2)>>2]|0;r=a+4|0;if(!(f[r>>2]|0))f[r>>2]=(f[69]|0)+2;f[a+12>>2]=e+4;s[399]=t+-1<<16>>16;t=91;}else t=91;break}case 123:{t=f[69]|0;r=f[63]|0;e=t;do{if((s[t>>1]|0)==41&(r|0)!=0?(f[r+4>>2]|0)==(t|0):0){a=f[64]|0;f[63]=a;if(!a){f[59]=0;break}else {f[a+32>>2]=0;break}}}while(0);r=f[70]|0;a=s[400]|0;t=a&65535;f[r+(t<<3)>>2]=(i[806]|0)==0?2:6;s[400]=a+1<<16>>16;f[r+(t<<3)+4>>2]=e;i[806]=0;t=91;break}case 125:{e=s[400]|0;if(!(e<<16>>16)){t=49;break e}r=f[70]|0;t=e+-1<<16>>16;s[400]=t;if((f[r+((t&65535)<<3)>>2]|0)==4){h();t=91;}else t=91;break}case 39:{v(39);t=91;break}case 34:{v(34);t=91;break}case 47:switch(s[e+4>>1]|0){case 47:{P();break a}case 42:{y(1);break a}default:{e=f[69]|0;a=s[e>>1]|0;r:do{if(!(U(a)|0))if(a<<16>>16==41){r=s[400]|0;if(!(D(f[(f[70]|0)+((r&65535)<<3)+4>>2]|0)|0))t=65;}else t=64;else switch(a<<16>>16){case 46:if(((s[e+-2>>1]|0)+-48&65535)<10){t=64;break r}else break r;case 43:if((s[e+-2>>1]|0)==43){t=64;break r}else break r;case 45:if((s[e+-2>>1]|0)==45){t=64;break r}else break r;default:break r}}while(0);if((t|0)==64){r=s[400]|0;t=65;}r:do{if((t|0)==65){t=0;if(r<<16>>16!=0?(c=f[70]|0,b=(r&65535)+-1|0,a<<16>>16==102?(f[c+(b<<3)>>2]|0)==1:0):0){if((s[e+-2>>1]|0)==111?$(f[c+(b<<3)+4>>2]|0,44,3)|0:0)break}else t=69;if((t|0)==69?(0,a<<16>>16==125):0){t=f[70]|0;r=r&65535;if(p(f[t+(r<<3)+4>>2]|0)|0)break;if((f[t+(r<<3)>>2]|0)==6)break}if(!(o(e)|0)){switch(a<<16>>16){case 0:break r;case 47:{if(i[805]|0)break r;break}default:{}}t=f[65]|0;if((t|0?e>>>0>=(f[t>>2]|0)>>>0:0)?e>>>0<=(f[t+4>>2]|0)>>>0:0){g();i[805]=0;t=91;break a}r=f[3]|0;do{if(e>>>0<=r>>>0)break;e=e+-2|0;f[69]=e;a=s[e>>1]|0;}while(!(E(a)|0));if(F(a)|0){do{if(e>>>0<=r>>>0)break;e=e+-2|0;f[69]=e;}while(F(s[e>>1]|0)|0);if(j(e)|0){g();i[805]=0;t=91;break a}}i[805]=1;t=91;break a}}}while(0);g();i[805]=0;t=91;break a}}case 96:{r=f[70]|0;a=s[400]|0;t=a&65535;f[r+(t<<3)+4>>2]=f[69];s[400]=a+1<<16>>16;f[r+(t<<3)>>2]=3;h();t=91;break}default:t=91;}}while(0);if((t|0)==91){t=0;f[69]=f[72];}e=f[72]|0;}if((t|0)==36){T();e=0;break}else if((t|0)==49){T();e=0;break}else if((t|0)==92){e=(i[802]|0)==0?(s[399]|s[400])<<16>>16==0:0;break}}}while(0);n=u;return e|0}function k(){var e=0,a=0,r=0,t=0,c=0,n=0,b=0,k=0,l=0,o=0,h=0,d=0,C=0,g=0;k=f[72]|0;l=f[65]|0;g=k+12|0;f[72]=g;r=w(1)|0;e=f[72]|0;if(!((e|0)==(g|0)?!(I(r)|0):0))C=3;e:do{if((C|0)==3){a:do{switch(r<<16>>16){case 123:{f[72]=e+2;e=w(1)|0;a=f[72]|0;while(1){if(W(e)|0){v(e);e=(f[72]|0)+2|0;f[72]=e;}else {q(e)|0;e=f[72]|0;}w(1)|0;e=A(a,e)|0;if(e<<16>>16==44){f[72]=(f[72]|0)+2;e=w(1)|0;}if(e<<16>>16==125){C=15;break}g=a;a=f[72]|0;if((a|0)==(g|0)){C=12;break}if(a>>>0>(f[73]|0)>>>0){C=14;break}}if((C|0)==12){T();break e}else if((C|0)==14){T();break e}else if((C|0)==15){i[803]=1;f[72]=(f[72]|0)+2;break a}break}case 42:{f[72]=e+2;w(1)|0;g=f[72]|0;A(g,g)|0;break}default:{i[804]=0;switch(r<<16>>16){case 100:{k=e+14|0;f[72]=k;switch((w(1)|0)<<16>>16){case 97:{a=f[72]|0;if((m(a+2|0,72,8)|0)==0?(c=a+10|0,F(s[c>>1]|0)|0):0){f[72]=c;w(0)|0;C=22;}break}case 102:{C=22;break}case 99:{a=f[72]|0;if(((m(a+2|0,36,8)|0)==0?(t=a+10|0,g=s[t>>1]|0,V(g)|0|g<<16>>16==123):0)?(f[72]=t,n=w(1)|0,n<<16>>16!=123):0){d=n;C=31;}break}default:{}}r:do{if((C|0)==22?(b=f[72]|0,(m(b+2|0,80,14)|0)==0):0){r=b+16|0;a=s[r>>1]|0;if(!(V(a)|0))switch(a<<16>>16){case 40:case 42:break;default:break r}f[72]=r;a=w(1)|0;if(a<<16>>16==42){f[72]=(f[72]|0)+2;a=w(1)|0;}if(a<<16>>16!=40){d=a;C=31;}}}while(0);if((C|0)==31?(o=f[72]|0,q(d)|0,h=f[72]|0,h>>>0>o>>>0):0){O(e,k,o,h);f[72]=(f[72]|0)+-2;break e}O(e,k,0,0);f[72]=e+12;break e}case 97:{f[72]=e+10;w(0)|0;e=f[72]|0;C=35;break}case 102:{C=35;break}case 99:{if((m(e+2|0,36,8)|0)==0?(a=e+10|0,E(s[a>>1]|0)|0):0){f[72]=a;g=w(1)|0;C=f[72]|0;q(g)|0;g=f[72]|0;O(C,g,C,g);f[72]=(f[72]|0)+-2;break e}e=e+4|0;f[72]=e;break}case 108:case 118:break;default:break e}if((C|0)==35){f[72]=e+16;e=w(1)|0;if(e<<16>>16==42){f[72]=(f[72]|0)+2;e=w(1)|0;}C=f[72]|0;q(e)|0;g=f[72]|0;O(C,g,C,g);f[72]=(f[72]|0)+-2;break e}f[72]=e+6;i[804]=0;r=w(1)|0;e=f[72]|0;r=(q(r)|0|32)<<16>>16==123;t=f[72]|0;if(r){f[72]=t+2;g=w(1)|0;e=f[72]|0;q(g)|0;}r:while(1){a=f[72]|0;if((a|0)==(e|0))break;O(e,a,e,a);a=w(1)|0;if(r)switch(a<<16>>16){case 93:case 125:break e;default:{}}e=f[72]|0;if(a<<16>>16!=44){C=51;break}f[72]=e+2;a=w(1)|0;e=f[72]|0;switch(a<<16>>16){case 91:case 123:{C=51;break r}default:{}}q(a)|0;}if((C|0)==51)f[72]=e+-2;if(!r)break e;f[72]=t+-2;break e}}}while(0);g=(w(1)|0)<<16>>16==102;e=f[72]|0;if(g?(m(e+2|0,66,6)|0)==0:0){f[72]=e+8;u(k,w(1)|0,0);e=(l|0)==0?240:l+16|0;while(1){e=f[e>>2]|0;if(!e)break e;f[e+12>>2]=0;f[e+8>>2]=0;e=e+16|0;}}f[72]=e+-2;}}while(0);return}function l(){var e=0,a=0,r=0,t=0,c=0,n=0,b=0;c=f[72]|0;r=c+12|0;f[72]=r;t=w(1)|0;a=f[72]|0;e:do{if(t<<16>>16!=46)if(t<<16>>16==115&a>>>0>r>>>0)if((m(a+2|0,56,10)|0)==0?(e=a+12|0,V(s[e>>1]|0)|0):0)n=14;else {a=6;r=0;n=46;}else {e=t;r=0;n=15;}else {f[72]=a+2;switch((w(1)|0)<<16>>16){case 109:{e=f[72]|0;if(m(e+2|0,50,6)|0)break e;a=f[69]|0;if(!(G(a)|0)?(s[a>>1]|0)==46:0)break e;d(c,c,e+8|0,2);break e}case 115:{e=f[72]|0;if(m(e+2|0,56,10)|0)break e;a=f[69]|0;if(!(G(a)|0)?(s[a>>1]|0)==46:0)break e;e=e+12|0;n=14;break e}default:break e}}}while(0);if((n|0)==14){f[72]=e;e=w(1)|0;r=1;n=15;}e:do{if((n|0)==15)switch(e<<16>>16){case 40:{a=f[70]|0;b=s[400]|0;t=b&65535;f[a+(t<<3)>>2]=5;e=f[72]|0;s[400]=b+1<<16>>16;f[a+(t<<3)+4>>2]=e;if((s[f[69]>>1]|0)==46)break e;f[72]=e+2;a=w(1)|0;d(c,f[72]|0,0,e);if(r){e=f[63]|0;f[e+28>>2]=5;}else e=f[63]|0;c=f[71]|0;b=s[399]|0;s[399]=b+1<<16>>16;f[c+((b&65535)<<2)>>2]=e;switch(a<<16>>16){case 39:{v(39);break}case 34:{v(34);break}default:{f[72]=(f[72]|0)+-2;break e}}e=(f[72]|0)+2|0;f[72]=e;switch((w(1)|0)<<16>>16){case 44:{f[72]=(f[72]|0)+2;w(1)|0;c=f[63]|0;f[c+4>>2]=e;b=f[72]|0;f[c+16>>2]=b;i[c+24>>0]=1;f[72]=b+-2;break e}case 41:{s[400]=(s[400]|0)+-1<<16>>16;b=f[63]|0;f[b+4>>2]=e;f[b+12>>2]=(f[72]|0)+2;i[b+24>>0]=1;s[399]=(s[399]|0)+-1<<16>>16;break e}default:{f[72]=(f[72]|0)+-2;break e}}}case 123:{if(r){a=12;r=1;n=46;break e}e=f[72]|0;if(s[400]|0){f[72]=e+-2;break e}while(1){if(e>>>0>=(f[73]|0)>>>0)break;e=w(1)|0;if(!(W(e)|0)){if(e<<16>>16==125){n=36;break}}else v(e);e=(f[72]|0)+2|0;f[72]=e;}if((n|0)==36)f[72]=(f[72]|0)+2;b=(w(1)|0)<<16>>16==102;e=f[72]|0;if(b?m(e+2|0,66,6)|0:0){T();break e}f[72]=e+8;e=w(1)|0;if(W(e)|0){u(c,e,0);break e}else {T();break e}}default:{if(r){a=12;r=1;n=46;break e}switch(e<<16>>16){case 42:case 39:case 34:{r=0;n=48;break e}default:{a=6;r=0;n=46;break e}}}}}while(0);if((n|0)==46){e=f[72]|0;if((e|0)==(c+(a<<1)|0))f[72]=e+-2;else n=48;}do{if((n|0)==48){if(s[400]|0){f[72]=(f[72]|0)+-2;break}e=f[73]|0;a=f[72]|0;while(1){if(a>>>0>=e>>>0){n=55;break}t=s[a>>1]|0;if(W(t)|0){n=53;break}b=a+2|0;f[72]=b;a=b;}if((n|0)==53){u(c,t,r);break}else if((n|0)==55){T();break}}}while(0);return}function u(e,a,r){e=e|0;a=a|0;r=r|0;var i=0,t=0;i=(f[72]|0)+2|0;switch(a<<16>>16){case 39:{v(39);t=5;break}case 34:{v(34);t=5;break}default:T();}do{if((t|0)==5){d(e,i,f[72]|0,1);if(r)f[(f[63]|0)+28>>2]=4;f[72]=(f[72]|0)+2;a=w(0)|0;r=a<<16>>16==97;if(r){i=f[72]|0;if(m(i+2|0,94,10)|0)t=13;}else {i=f[72]|0;if(!(((a<<16>>16==119?(s[i+2>>1]|0)==105:0)?(s[i+4>>1]|0)==116:0)?(s[i+6>>1]|0)==104:0))t=13;}if((t|0)==13){f[72]=i+-2;break}f[72]=i+((r?6:4)<<1);if((w(1)|0)<<16>>16!=123){f[72]=i;break}r=f[72]|0;a=r;e:while(1){f[72]=a+2;a=w(1)|0;switch(a<<16>>16){case 39:{v(39);f[72]=(f[72]|0)+2;a=w(1)|0;break}case 34:{v(34);f[72]=(f[72]|0)+2;a=w(1)|0;break}default:a=q(a)|0;}if(a<<16>>16!=58){t=22;break}f[72]=(f[72]|0)+2;switch((w(1)|0)<<16>>16){case 39:{v(39);break}case 34:{v(34);break}default:{t=26;break e}}f[72]=(f[72]|0)+2;switch((w(1)|0)<<16>>16){case 125:{t=31;break e}case 44:break;default:{t=30;break e}}f[72]=(f[72]|0)+2;if((w(1)|0)<<16>>16==125){t=31;break}a=f[72]|0;}if((t|0)==22){f[72]=i;break}else if((t|0)==26){f[72]=i;break}else if((t|0)==30){f[72]=i;break}else if((t|0)==31){t=f[63]|0;f[t+16>>2]=r;f[t+12>>2]=(f[72]|0)+2;break}}}while(0);return}function o(e){e=e|0;e:do{switch(s[e>>1]|0){case 100:switch(s[e+-2>>1]|0){case 105:{e=$(e+-4|0,104,2)|0;break e}case 108:{e=$(e+-4|0,108,3)|0;break e}default:{e=0;break e}}case 101:switch(s[e+-2>>1]|0){case 115:switch(s[e+-4>>1]|0){case 108:{e=B(e+-6|0,101)|0;break e}case 97:{e=B(e+-6|0,99)|0;break e}default:{e=0;break e}}case 116:{e=$(e+-4|0,114,4)|0;break e}case 117:{e=$(e+-4|0,122,6)|0;break e}default:{e=0;break e}}case 102:{if((s[e+-2>>1]|0)==111?(s[e+-4>>1]|0)==101:0)switch(s[e+-6>>1]|0){case 99:{e=$(e+-8|0,134,6)|0;break e}case 112:{e=$(e+-8|0,146,2)|0;break e}default:{e=0;break e}}else e=0;break}case 107:{e=$(e+-2|0,150,4)|0;break}case 110:{e=e+-2|0;if(B(e,105)|0)e=1;else e=$(e,158,5)|0;break}case 111:{e=B(e+-2|0,100)|0;break}case 114:{e=$(e+-2|0,168,7)|0;break}case 116:{e=$(e+-2|0,182,4)|0;break}case 119:switch(s[e+-2>>1]|0){case 101:{e=B(e+-4|0,110)|0;break e}case 111:{e=$(e+-4|0,190,3)|0;break e}default:{e=0;break e}}default:e=0;}}while(0);return e|0}function h(){var e=0,a=0,r=0,i=0;a=f[73]|0;r=f[72]|0;e:while(1){e=r+2|0;if(r>>>0>=a>>>0){a=10;break}switch(s[e>>1]|0){case 96:{a=7;break e}case 36:{if((s[r+4>>1]|0)==123){a=6;break e}break}case 92:{e=r+4|0;break}default:{}}r=e;}if((a|0)==6){e=r+4|0;f[72]=e;a=f[70]|0;i=s[400]|0;r=i&65535;f[a+(r<<3)>>2]=4;s[400]=i+1<<16>>16;f[a+(r<<3)+4>>2]=e;}else if((a|0)==7){f[72]=e;r=f[70]|0;i=(s[400]|0)+-1<<16>>16;s[400]=i;if((f[r+((i&65535)<<3)>>2]|0)!=3)T();}else if((a|0)==10){f[72]=e;T();}return}function w(e){e=e|0;var a=0,r=0,i=0;r=f[72]|0;e:do{a=s[r>>1]|0;a:do{if(a<<16>>16!=47)if(e)if(V(a)|0)break;else break e;else if(F(a)|0)break;else break e;else switch(s[r+2>>1]|0){case 47:{P();break a}case 42:{y(e);break a}default:{a=47;break e}}}while(0);i=f[72]|0;r=i+2|0;f[72]=r;}while(i>>>0<(f[73]|0)>>>0);return a|0}function d(e,a,r,s){e=e|0;a=a|0;r=r|0;s=s|0;var t=0,c=0;c=f[67]|0;f[67]=c+36;t=f[63]|0;f[((t|0)==0?236:t+32|0)>>2]=c;f[64]=t;f[63]=c;f[c+8>>2]=e;if(2==(s|0)){e=3;t=r;}else {t=1==(s|0);e=t?1:2;t=t?r+2|0:0;}f[c+12>>2]=t;f[c+28>>2]=e;f[c>>2]=a;f[c+4>>2]=r;f[c+16>>2]=0;f[c+20>>2]=s;a=1==(s|0);i[c+24>>0]=a&1;f[c+32>>2]=0;if(a|2==(s|0))i[803]=1;return}function v(e){e=e|0;var a=0,r=0,i=0,t=0;t=f[73]|0;a=f[72]|0;while(1){i=a+2|0;if(a>>>0>=t>>>0){a=9;break}r=s[i>>1]|0;if(r<<16>>16==e<<16>>16){a=10;break}if(r<<16>>16==92){r=a+4|0;if((s[r>>1]|0)==13){a=a+6|0;a=(s[a>>1]|0)==10?a:r;}else a=r;}else if(Z(r)|0){a=9;break}else a=i;}if((a|0)==9){f[72]=i;T();}else if((a|0)==10)f[72]=i;return}function A(e,a){e=e|0;a=a|0;var r=0,i=0,t=0,c=0;r=f[72]|0;i=s[r>>1]|0;c=(e|0)==(a|0);t=c?0:e;c=c?0:a;if(i<<16>>16==97){f[72]=r+4;r=w(1)|0;e=f[72]|0;if(W(r)|0){v(r);a=(f[72]|0)+2|0;f[72]=a;}else {q(r)|0;a=f[72]|0;}i=w(1)|0;r=f[72]|0;}if((r|0)!=(e|0))O(e,a,t,c);return i|0}function C(){var e=0,a=0,r=0;r=f[73]|0;a=f[72]|0;e:while(1){e=a+2|0;if(a>>>0>=r>>>0){a=6;break}switch(s[e>>1]|0){case 13:case 10:{a=6;break e}case 93:{a=7;break e}case 92:{e=a+4|0;break}default:{}}a=e;}if((a|0)==6){f[72]=e;T();e=0;}else if((a|0)==7){f[72]=e;e=93;}return e|0}function g(){var e=0,a=0,r=0;e:while(1){e=f[72]|0;a=e+2|0;f[72]=a;if(e>>>0>=(f[73]|0)>>>0){r=7;break}switch(s[a>>1]|0){case 13:case 10:{r=7;break e}case 47:break e;case 91:{C()|0;break}case 92:{f[72]=e+4;break}default:{}}}if((r|0)==7)T();return}function p(e){e=e|0;switch(s[e>>1]|0){case 62:{e=(s[e+-2>>1]|0)==61;break}case 41:case 59:{e=1;break}case 104:{e=$(e+-2|0,210,4)|0;break}case 121:{e=$(e+-2|0,218,6)|0;break}case 101:{e=$(e+-2|0,230,3)|0;break}default:e=0;}return e|0}function y(e){e=e|0;var a=0,r=0,i=0,t=0,c=0;t=(f[72]|0)+2|0;f[72]=t;r=f[73]|0;while(1){a=t+2|0;if(t>>>0>=r>>>0)break;i=s[a>>1]|0;if(!e?Z(i)|0:0)break;if(i<<16>>16==42?(s[t+4>>1]|0)==47:0){c=8;break}t=a;}if((c|0)==8){f[72]=a;a=t+4|0;}f[72]=a;return}function m(e,a,r){e=e|0;a=a|0;r=r|0;var s=0,f=0;e:do{if(!r)e=0;else {while(1){s=i[e>>0]|0;f=i[a>>0]|0;if(s<<24>>24!=f<<24>>24)break;r=r+-1|0;if(!r){e=0;break e}else {e=e+1|0;a=a+1|0;}}e=(s&255)-(f&255)|0;}}while(0);return e|0}function I(e){e=e|0;e:do{switch(e<<16>>16){case 38:case 37:case 33:{e=1;break}default:if((e&-8)<<16>>16==40|(e+-58&65535)<6)e=1;else {switch(e<<16>>16){case 91:case 93:case 94:{e=1;break e}default:{}}e=(e+-123&65535)<4;}}}while(0);return e|0}function U(e){e=e|0;e:do{switch(e<<16>>16){case 38:case 37:case 33:break;default:if(!((e+-58&65535)<6|(e+-40&65535)<7&e<<16>>16!=41)){switch(e<<16>>16){case 91:case 94:break e;default:{}}return e<<16>>16!=125&(e+-123&65535)<4|0}}}while(0);return 1}function x(e){e=e|0;var a=0;a=s[e>>1]|0;e:do{if((a+-9&65535)>=5){switch(a<<16>>16){case 160:case 32:{a=1;break e}default:{}}if(I(a)|0)return a<<16>>16!=46|(G(e)|0)|0;else a=0;}else a=1;}while(0);return a|0}function S(e){e=e|0;var a=0,r=0,i=0,t=0;r=n;n=n+16|0;i=r;f[i>>2]=0;f[66]=e;a=f[3]|0;t=a+(e<<1)|0;e=t+2|0;s[t>>1]=0;f[i>>2]=e;f[67]=e;f[59]=0;f[63]=0;f[61]=0;f[60]=0;f[65]=0;f[62]=0;n=r;return a|0}function O(e,a,r,s){e=e|0;a=a|0;r=r|0;s=s|0;var t=0,c=0;t=f[67]|0;f[67]=t+20;c=f[65]|0;f[((c|0)==0?240:c+16|0)>>2]=t;f[65]=t;f[t>>2]=e;f[t+4>>2]=a;f[t+8>>2]=r;f[t+12>>2]=s;f[t+16>>2]=0;i[803]=1;return}function $(e,a,r){e=e|0;a=a|0;r=r|0;var i=0,s=0;i=e+(0-r<<1)|0;s=i+2|0;e=f[3]|0;if(s>>>0>=e>>>0?(m(s,a,r<<1)|0)==0:0)if((s|0)==(e|0))e=1;else e=x(i)|0;else e=0;return e|0}function j(e){e=e|0;switch(s[e>>1]|0){case 107:{e=$(e+-2|0,150,4)|0;break}case 101:{if((s[e+-2>>1]|0)==117)e=$(e+-4|0,122,6)|0;else e=0;break}default:e=0;}return e|0}function B(e,a){e=e|0;a=a|0;var r=0;r=f[3]|0;if(r>>>0<=e>>>0?(s[e>>1]|0)==a<<16>>16:0)if((r|0)==(e|0))r=1;else r=E(s[e+-2>>1]|0)|0;else r=0;return r|0}function E(e){e=e|0;e:do{if((e+-9&65535)<5)e=1;else {switch(e<<16>>16){case 32:case 160:{e=1;break e}default:{}}e=e<<16>>16!=46&(I(e)|0);}}while(0);return e|0}function P(){var e=0,a=0,r=0;e=f[73]|0;r=f[72]|0;e:while(1){a=r+2|0;if(r>>>0>=e>>>0)break;switch(s[a>>1]|0){case 13:case 10:break e;default:r=a;}}f[72]=a;return}function q(e){e=e|0;while(1){if(V(e)|0)break;if(I(e)|0)break;e=(f[72]|0)+2|0;f[72]=e;e=s[e>>1]|0;if(!(e<<16>>16)){e=0;break}}return e|0}function z(){var e=0;e=f[(f[61]|0)+20>>2]|0;switch(e|0){case 1:{e=-1;break}case 2:{e=-2;break}default:e=e-(f[3]|0)>>1;}return e|0}function D(e){e=e|0;if(!($(e,196,5)|0)?!($(e,44,3)|0):0)e=$(e,206,2)|0;else e=1;return e|0}function F(e){e=e|0;switch(e<<16>>16){case 160:case 32:case 12:case 11:case 9:{e=1;break}default:e=0;}return e|0}function G(e){e=e|0;if((s[e>>1]|0)==46?(s[e+-2>>1]|0)==46:0)e=(s[e+-4>>1]|0)==46;else e=0;return e|0}function H(e){e=e|0;if((f[3]|0)==(e|0))e=1;else e=x(e+-2|0)|0;return e|0}function J(){var e=0;e=f[(f[62]|0)+12>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function K(){var e=0;e=f[(f[61]|0)+12>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function L(){var e=0;e=f[(f[62]|0)+8>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function M(){var e=0;e=f[(f[61]|0)+16>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function N(){var e=0;e=f[(f[61]|0)+4>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function Q(){var e=0;e=f[61]|0;e=f[((e|0)==0?236:e+32|0)>>2]|0;f[61]=e;return (e|0)!=0|0}function R(){var e=0;e=f[62]|0;e=f[((e|0)==0?240:e+16|0)>>2]|0;f[62]=e;return (e|0)!=0|0}function T(){i[802]=1;f[68]=(f[72]|0)-(f[3]|0)>>1;f[72]=(f[73]|0)+2;return}function V(e){e=e|0;return (e|128)<<16>>16==160|(e+-9&65535)<5|0}function W(e){e=e|0;return e<<16>>16==39|e<<16>>16==34|0}function X(){return (f[(f[61]|0)+8>>2]|0)-(f[3]|0)>>1|0}function Y(){return (f[(f[62]|0)+4>>2]|0)-(f[3]|0)>>1|0}function Z(e){e=e|0;return e<<16>>16==13|e<<16>>16==10|0}function _(){return (f[f[61]>>2]|0)-(f[3]|0)>>1|0}function ee(){return (f[f[62]>>2]|0)-(f[3]|0)>>1|0}function ae(){return t[(f[61]|0)+24>>0]|0|0}function re(e){e=e|0;f[3]=e;return}function ie(){return f[(f[61]|0)+28>>2]|0}function se(){return (i[803]|0)!=0|0}function fe(){return (i[804]|0)!=0|0}function te(){return f[68]|0}function ce(e){e=e|0;n=e+992+15&-16;return 992}return {su:ce,ai:M,e:te,ee:Y,ele:J,els:L,es:ee,f:fe,id:z,ie:N,ip:ae,is:_,it:ie,ms:se,p:b,re:R,ri:Q,sa:S,se:K,ses:re,ss:X}}("undefined"!=typeof self?self:global,{},a),r=e.su(i-(2<<17));}const h=t$1.length+1;e.ses(r),e.sa(h-1),s(t$1,new Uint16Array(a,r,h)),e.p()||(n=e.e(),o());const w=[],d=[];for(;e.ri();){const a=e.is(),r=e.ie(),i=e.ai(),s=e.id(),f=e.ss(),c=e.se(),n=e.it();let k;e.ip()&&(k=b(-1===s?a:a+1,t$1.charCodeAt(-1===s?a-1:a))),w.push({t:n,n:k,s:a,e:r,ss:f,se:c,d:s,a:i});}for(;e.re();){const a=e.es(),r=e.ee(),i=e.els(),s=e.ele(),f=t$1.charCodeAt(a),c=i>=0?t$1.charCodeAt(i):-1;d.push({s:a,e:r,ls:i,le:s,n:34===f||39===f?b(a+1,f):t$1.slice(a,r),ln:i<0?void 0:34===c||39===c?b(i+1,c):t$1.slice(i,s)});}return [w,d,!!e.f(),!!e.ms()]}function b(e,a){n=e;let r="",i=n;for(;;){n>=t$1.length&&o();const e=t$1.charCodeAt(n);if(e===a)break;92===e?(r+=t$1.slice(i,n),r+=k(),i=n):(8232===e||8233===e||u(e)&&o(),++n);}return r+=t$1.slice(i,n++),r}function k(){let e=t$1.charCodeAt(++n);switch(++n,e){case 110:return "\n";case 114:return "\r";case 120:return String.fromCharCode(l(2));case 117:return function(){const e=t$1.charCodeAt(n);let a;123===e?(++n,a=l(t$1.indexOf("}",n)-n),++n,a>1114111&&o()):a=l(4);return a<=65535?String.fromCharCode(a):(a-=65536,String.fromCharCode(55296+(a>>10),56320+(1023&a)))}();case 116:return "\t";case 98:return "\b";case 118:return "\v";case 102:return "\f";case 13:10===t$1.charCodeAt(n)&&++n;case 10:return "";case 56:case 57:o();default:if(e>=48&&e<=55){let a=t$1.substr(n-1,3).match(/^[0-7]+/)[0],r=parseInt(a,8);return r>255&&(a=a.slice(0,-1),r=parseInt(a,8)),n+=a.length-1,e=t$1.charCodeAt(n),"0"===a&&56!==e&&57!==e||o(),String.fromCharCode(r)}return u(e)?"":String.fromCharCode(e)}}function l(e){const a=n;let r=0,i=0;for(let a=0;a<e;++a,++n){let e,s=t$1.charCodeAt(n);if(95!==s){if(s>=97)e=s-97+10;else if(s>=65)e=s-65+10;else {if(!(s>=48&&s<=57))break;e=s-48;}if(e>=16)break;i=s,r=16*r+e;}else 95!==i&&0!==a||o(),i=s;}return 95!==i&&n-a===e||o(),r}function u(e){return 13===e||10===e}function o(){throw Object.assign(Error(`Parse error ${c$1}:${t$1.slice(0,n).split("\n").length}:${n-t$1.lastIndexOf("\n",n-1)}`),{idx:n})}

  async function _resolve(id, parentUrl) {
    const urlResolved = resolveIfNotPlainOrUrl(id, parentUrl) || asURL(id);
    const firstResolved = firstImportMap && resolveImportMap(firstImportMap, urlResolved || id, parentUrl);
    const composedResolved =
      composedImportMap === firstImportMap ? firstResolved : (
        resolveImportMap(composedImportMap, urlResolved || id, parentUrl)
      );
    const resolved = composedResolved || firstResolved || throwUnresolved(id, parentUrl);
    // needsShim, shouldShim per load record to set on parent
    let n = false,
      N = false;
    if (!supportsImportMaps) {
      // bare specifier -> needs shim
      if (!urlResolved) n = true;
      // url mapping -> should shim
      else if (urlResolved !== resolved) N = true;
    } else if (!supportsMultipleImportMaps) {
      // bare specifier and not resolved by first import map -> needs shim
      if (!urlResolved && !firstResolved) n = true;
      // resolution doesn't match first import map -> should shim
      if (firstResolved && resolved !== firstResolved) N = true;
    }
    return { r: resolved, n, N };
  }

  const resolve =
    resolveHook ?
      (id, parentUrl) => {
        const result = resolveHook(id, parentUrl, defaultResolve);
        return result ? { r: result, n: true, N: true } : _resolve(id, parentUrl);
      }
    : _resolve;

  // supports:
  // import('mod');
  // import('mod', { opts });
  // import('mod', { opts }, parentUrl);
  // import('mod', parentUrl);
  async function importHandler(id, ...args) {
    // parentUrl if present will be the last argument
    let parentUrl = args[args.length - 1];
    if (typeof parentUrl !== 'string') parentUrl = baseUrl;
    // needed for shim check
    await initPromise;
    if (importHook) await importHook(id, typeof args[1] !== 'string' ? args[1] : {}, parentUrl);
    if (shimMode || !baselinePassthrough) {
      if (hasDocument) processScriptsAndPreloads();
      legacyAcceptingImportMaps = false;
    }
    await importMapPromise;
    return (await resolve(id, parentUrl)).r;
  }

  // import()
  async function importShim(...args) {
    console.info(`es-module-shims: importShim("${args[0]}")`);
    return topLevelLoad(await importHandler(...args), { credentials: 'same-origin' });
  }

  // import.source()
  if (sourcePhaseEnabled)
    importShim.source = async function importShimSource(...args) {
      const url = await importHandler(...args);
      const load = getOrCreateLoad(url, { credentials: 'same-origin' }, null, null);
      lastLoad = undefined;
      if (firstPolyfillLoad && !shimMode && load.n && nativelyLoaded) {
        onpolyfill();
        firstPolyfillLoad = false;
      }
      await load.f;
      return importShim._s[load.r];
    };

  self.importShim = importShim;

  function defaultResolve(id, parentUrl) {
    return (
      resolveImportMap(composedImportMap, resolveIfNotPlainOrUrl(id, parentUrl) || id, parentUrl) ||
      throwUnresolved(id, parentUrl)
    );
  }

  function throwUnresolved(id, parentUrl) {
    throw Error(`Unable to resolve specifier '${id}'${fromParent(parentUrl)}`);
  }

  const resolveSync = (id, parentUrl = baseUrl) => {
    parentUrl = `${parentUrl}`;
    const result = resolveHook && resolveHook(id, parentUrl, defaultResolve);
    return result && !result.then ? result : defaultResolve(id, parentUrl);
  };

  function metaResolve(id, parentUrl = this.url) {
    return resolveSync(id, parentUrl);
  }

  importShim.resolve = resolveSync;
  importShim.getImportMap = () => JSON.parse(JSON.stringify(composedImportMap));
  importShim.addImportMap = importMapIn => {
    if (!shimMode) throw new Error('Unsupported in polyfill mode.');
    composedImportMap = resolveAndComposeImportMap(importMapIn, baseUrl, composedImportMap);
  };

  const registry = (importShim._r = {});
  const sourceCache = (importShim._s = {});

  async function loadAll(load, seen) {
    seen[load.u] = 1;
    await load.L;
    await Promise.all(
      load.d.map(({ l: dep, s: sourcePhase }) => {
        if (dep.b || seen[dep.u]) return;
        if (sourcePhase) return dep.f;
        return loadAll(dep, seen);
      })
    );
  }

  let importMapSrc = false;
  let multipleImportMaps = false;
  let firstImportMap = null;
  // To support polyfilling multiple import maps, we separately track the composed import map from the first import map
  let composedImportMap = { imports: {}, scopes: {}, integrity: {} };
  let baselinePassthrough;

  const initPromise = featureDetectionPromise.then(() => {
    baselinePassthrough =
      esmsInitOptions.polyfillEnable !== true &&
      supportsDynamicImport &&
      supportsImportMeta &&
      supportsImportMaps &&
      (!jsonModulesEnabled || supportsJsonType) &&
      (!cssModulesEnabled || supportsCssType) &&
      (!wasmModulesEnabled || supportsWasmModules) &&
      (!sourcePhaseEnabled || supportsSourcePhase) &&
      (!multipleImportMaps || supportsMultipleImportMaps) &&
      !importMapSrc &&
      !typescriptEnabled;
    if (sourcePhaseEnabled && typeof WebAssembly !== 'undefined' && !Object.getPrototypeOf(WebAssembly.Module).name) {
      const s = Symbol();
      const brand = m =>
        Object.defineProperty(m, s, { writable: false, configurable: false, value: 'WebAssembly.Module' });
      class AbstractModuleSource {
        get [Symbol.toStringTag]() {
          if (this[s]) return this[s];
          throw new TypeError('Not an AbstractModuleSource');
        }
      }
      const { Module: wasmModule, compile: wasmCompile, compileStreaming: wasmCompileStreaming } = WebAssembly;
      WebAssembly.Module = Object.setPrototypeOf(
        Object.assign(function Module(...args) {
          return brand(new wasmModule(...args));
        }, wasmModule),
        AbstractModuleSource
      );
      WebAssembly.Module.prototype = Object.setPrototypeOf(wasmModule.prototype, AbstractModuleSource.prototype);
      WebAssembly.compile = function compile(...args) {
        return wasmCompile(...args).then(brand);
      };
      WebAssembly.compileStreaming = function compileStreaming(...args) {
        return wasmCompileStreaming(...args).then(brand);
      };
    }
    if (hasDocument) {
      if (!supportsImportMaps) {
        const supports = HTMLScriptElement.supports || (type => type === 'classic' || type === 'module');
        HTMLScriptElement.supports = type => type === 'importmap' || supports(type);
      }
      if (shimMode || !baselinePassthrough) {
        attachMutationObserver();
        if (document.readyState === 'complete') {
          readyStateCompleteCheck();
        } else {
          async function readyListener() {
            await initPromise;
            processScriptsAndPreloads();
            if (document.readyState === 'complete') {
              readyStateCompleteCheck();
              document.removeEventListener('readystatechange', readyListener);
            }
          }
          document.addEventListener('readystatechange', readyListener);
        }
      }
      processScriptsAndPreloads();
    }
    return undefined;
  });

  function attachMutationObserver() {
    new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;
        for (const node of mutation.addedNodes) {
          if (node.tagName === 'SCRIPT') {
            if (node.type === (shimMode ? 'module-shim' : 'module') && !node.ep) processScript(node, true);
            if (node.type === (shimMode ? 'importmap-shim' : 'importmap') && !node.ep) processImportMap(node, true);
          } else if (
            node.tagName === 'LINK' &&
            node.rel === (shimMode ? 'modulepreload-shim' : 'modulepreload') &&
            !node.ep
          ) {
            processPreload(node);
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
    processScriptsAndPreloads();
  }

  let importMapPromise = initPromise;
  let firstPolyfillLoad = true;
  let legacyAcceptingImportMaps = true;

  async function topLevelLoad(url, fetchOpts, source, nativelyLoaded, lastStaticLoadPromise) {
    legacyAcceptingImportMaps = false;
    await initPromise;
    await importMapPromise;
    if (importHook) await importHook(url, typeof fetchOpts !== 'string' ? fetchOpts : {}, '');
    // early analysis opt-out - no need to even fetch if we have feature support
    if (!shimMode && baselinePassthrough) {
      console.info(`es-module-shims: early load exit as we have baseline modules support ${url}`);
      // for polyfill case, only dynamic import needs a return value here, and dynamic import will never pass nativelyLoaded
      if (nativelyLoaded) return null;
      await lastStaticLoadPromise;
      return dynamicImport(source ? createBlob(source) : url, {
        errUrl: url || source
      });
    }
    const load = getOrCreateLoad(url, fetchOpts, null, source);
    linkLoad(load, fetchOpts);
    const seen = {};
    await loadAll(load, seen);
    lastLoad = undefined;
    resolveDeps(load, seen);
    await lastStaticLoadPromise;
    if (source && !shimMode && !load.n) {
      if (nativelyLoaded) return;
      if (revokeBlobURLs) revokeObjectURLs(Object.keys(seen));
      return await dynamicImport(createBlob(source), { errUrl: source });
    }
    if (firstPolyfillLoad && !shimMode && load.n && nativelyLoaded) {
      onpolyfill();
      firstPolyfillLoad = false;
    }
    const module = await dynamicImport(!shimMode && !load.n && nativelyLoaded ? load.u : load.b, { errUrl: load.u });
    // if the top-level load is a shell, run its update function
    if (load.s) (await dynamicImport(load.s)).u$_(module);
    if (revokeBlobURLs) revokeObjectURLs(Object.keys(seen));
    // when tla is supported, this should return the tla promise as an actual handle
    // so readystate can still correspond to the sync subgraph exec completions
    return module;
  }

  function revokeObjectURLs(registryKeys) {
    let batch = 0;
    const keysLength = registryKeys.length;
    const schedule = self.requestIdleCallback ? self.requestIdleCallback : self.requestAnimationFrame;
    schedule(cleanup);
    function cleanup() {
      const batchStartIndex = batch * 100;
      if (batchStartIndex > keysLength) return;
      for (const key of registryKeys.slice(batchStartIndex, batchStartIndex + 100)) {
        const load = registry[key];
        if (load) URL.revokeObjectURL(load.b);
      }
      batch++;
      schedule(cleanup);
    }
  }

  function urlJsString(url) {
    return `'${url.replace(/'/g, "\\'")}'`;
  }

  let lastLoad;
  function resolveDeps(load, seen) {
    if (load.b || !seen[load.u]) return;
    seen[load.u] = 0;

    for (const { l: dep, s: sourcePhase } of load.d) {
      if (!sourcePhase) resolveDeps(dep, seen);
    }

    if (!load.n) load.n = load.d.some(dep => dep.l.n);
    if (!load.N) load.N = load.d.some(dep => dep.l.N);

    // use native loader whenever possible (n = needs shim) via executable subgraph passthrough
    // so long as the module doesn't use dynamic import or unsupported URL mappings (N = should shim)
    if (!shimMode && !load.n && !load.N) {
      load.b = lastLoad = load.u;
      load.S = undefined;
      return;
    }

    console.info(`es-module-shims: polyfilling ${load.u}`);

    const [imports, exports] = load.a;

    // "execution"
    const source = load.S;

    // edge doesnt execute sibling in order, so we fix this up by ensuring all previous executions are explicit dependencies
    let resolvedSource = edge && lastLoad ? `import '${lastLoad}';` : '';

    // once all deps have loaded we can inline the dependency resolution blobs
    // and define this blob
    let lastIndex = 0,
      depIndex = 0,
      dynamicImportEndStack = [];
    function pushStringTo(originalIndex) {
      while (dynamicImportEndStack[dynamicImportEndStack.length - 1] < originalIndex) {
        const dynamicImportEnd = dynamicImportEndStack.pop();
        resolvedSource += `${source.slice(lastIndex, dynamicImportEnd)}, ${urlJsString(load.r)}`;
        lastIndex = dynamicImportEnd;
      }
      resolvedSource += source.slice(lastIndex, originalIndex);
      lastIndex = originalIndex;
    }

    for (const { s: start, ss: statementStart, se: statementEnd, d: dynamicImportIndex, t } of imports) {
      // source phase
      if (t === 4) {
        let { l: depLoad } = load.d[depIndex++];
        pushStringTo(statementStart);
        resolvedSource += 'import ';
        lastIndex = statementStart + 14;
        pushStringTo(start - 1);
        resolvedSource += `/*${source.slice(start - 1, statementEnd)}*/'${createBlob(`export default importShim._s[${urlJsString(depLoad.r)}]`)}'`;
        lastIndex = statementEnd;
      }
      // dependency source replacements
      else if (dynamicImportIndex === -1) {
        let { l: depLoad } = load.d[depIndex++],
          blobUrl = depLoad.b,
          cycleShell = !blobUrl;
        if (cycleShell) {
          // circular shell creation
          if (!(blobUrl = depLoad.s)) {
            blobUrl = depLoad.s = createBlob(
              `export function u$_(m){${depLoad.a[1]
              .map(({ s, e }, i) => {
                const q = depLoad.S[s] === '"' || depLoad.S[s] === "'";
                return `e$_${i}=m${q ? `[` : '.'}${depLoad.S.slice(s, e)}${q ? `]` : ''}`;
              })
              .join(',')}}${
              depLoad.a[1].length ? `let ${depLoad.a[1].map((_, i) => `e$_${i}`).join(',')};` : ''
            }export {${depLoad.a[1]
              .map(({ s, e }, i) => `e$_${i} as ${depLoad.S.slice(s, e)}`)
              .join(',')}}\n//# sourceURL=${depLoad.r}?cycle`
            );
          }
        }

        pushStringTo(start - 1);
        resolvedSource += `/*${source.slice(start - 1, statementEnd)}*/'${blobUrl}'`;

        // circular shell execution
        if (!cycleShell && depLoad.s) {
          resolvedSource += `;import*as m$_${depIndex} from'${depLoad.b}';import{u$_ as u$_${depIndex}}from'${depLoad.s}';u$_${depIndex}(m$_${depIndex})`;
          depLoad.s = undefined;
        }
        lastIndex = statementEnd;
      }
      // import.meta
      else if (dynamicImportIndex === -2) {
        load.m = { url: load.r, resolve: metaResolve };
        metaHook(load.m, load.u);
        pushStringTo(start);
        resolvedSource += `importShim._r[${urlJsString(load.u)}].m`;
        lastIndex = statementEnd;
      }
      // dynamic import
      else {
        pushStringTo(statementStart + 6);
        resolvedSource += `Shim${t === 5 ? '.source' : ''}(`;
        dynamicImportEndStack.push(statementEnd - 1);
        lastIndex = start;
      }
    }

    // support progressive cycle binding updates (try statement avoids tdz errors)
    if (load.s && (imports.length === 0 || imports[imports.length - 1].d === -1))
      resolvedSource += `\n;import{u$_}from'${load.s}';try{u$_({${exports
      .filter(e => e.ln)
      .map(({ s, e, ln }) => `${source.slice(s, e)}:${ln}`)
      .join(',')}})}catch(_){};\n`;

    function pushSourceURL(commentPrefix, commentStart) {
      const urlStart = commentStart + commentPrefix.length;
      const commentEnd = source.indexOf('\n', urlStart);
      const urlEnd = commentEnd !== -1 ? commentEnd : source.length;
      let sourceUrl = source.slice(urlStart, urlEnd);
      try {
        sourceUrl = new URL(sourceUrl, load.r).href;
      } catch {}
      pushStringTo(urlStart);
      resolvedSource += sourceUrl;
      lastIndex = urlEnd;
    }

    let sourceURLCommentStart = source.lastIndexOf(sourceURLCommentPrefix);
    let sourceMapURLCommentStart = source.lastIndexOf(sourceMapURLCommentPrefix);

    // ignore sourceMap comments before already spliced code
    if (sourceURLCommentStart < lastIndex) sourceURLCommentStart = -1;
    if (sourceMapURLCommentStart < lastIndex) sourceMapURLCommentStart = -1;

    // sourceURL first / only
    if (
      sourceURLCommentStart !== -1 &&
      (sourceMapURLCommentStart === -1 || sourceMapURLCommentStart > sourceURLCommentStart)
    ) {
      pushSourceURL(sourceURLCommentPrefix, sourceURLCommentStart);
    }
    // sourceMappingURL
    if (sourceMapURLCommentStart !== -1) {
      pushSourceURL(sourceMapURLCommentPrefix, sourceMapURLCommentStart);
      // sourceURL last
      if (sourceURLCommentStart !== -1 && sourceURLCommentStart > sourceMapURLCommentStart)
        pushSourceURL(sourceURLCommentPrefix, sourceURLCommentStart);
    }

    pushStringTo(source.length);

    if (sourceURLCommentStart === -1) resolvedSource += sourceURLCommentPrefix + load.r;

    load.b = lastLoad = createBlob(resolvedSource);
    load.S = undefined;
  }

  const sourceURLCommentPrefix = '\n//# sourceURL=';
  const sourceMapURLCommentPrefix = '\n//# sourceMappingURL=';

  const jsContentType = /^(text|application)\/(x-)?javascript(;|$)/;
  const wasmContentType = /^application\/wasm(;|$)/;
  const jsonContentType = /^(text|application)\/json(;|$)/;
  const cssContentType = /^(text|application)\/css(;|$)/;
  const tsContentType = /^(application\/typescript|video\/mp2t)(;|$)|/;

  const cssUrlRegEx = /url\(\s*(?:(["'])((?:\\.|[^\n\\"'])+)\1|((?:\\.|[^\s,"'()\\])+))\s*\)/g;

  // restrict in-flight fetches to a pool of 100
  let p = [];
  let c = 0;
  function pushFetchPool() {
    if (++c > 100) return new Promise(r => p.push(r));
  }
  function popFetchPool() {
    c--;
    if (p.length) p.shift()();
  }

  async function doFetch(url, fetchOpts, parent) {
    if (enforceIntegrity && !fetchOpts.integrity) throw Error(`No integrity for ${url}${fromParent(parent)}.`);
    const poolQueue = pushFetchPool();
    if (poolQueue) await poolQueue;
    try {
      var res = await fetchHook(url, fetchOpts);
    } catch (e) {
      e.message = `Unable to fetch ${url}${fromParent(parent)} - see network log for details.\n` + e.message;
      throw e;
    } finally {
      popFetchPool();
    }

    if (!res.ok) {
      const error = new TypeError(`${res.status} ${res.statusText} ${res.url}${fromParent(parent)}`);
      error.response = res;
      throw error;
    }
    return res;
  }

  let esmsTsTransform;

  async function fetchModule(url, fetchOpts, parent) {
    const mapIntegrity = composedImportMap.integrity[url];
    const res = await doFetch(
      url,
      mapIntegrity && !fetchOpts.integrity ? Object.assign({}, fetchOpts, { integrity: mapIntegrity }) : fetchOpts,
      parent
    );
    const r = res.url;
    const contentType = res.headers.get('content-type');
    if (jsContentType.test(contentType)) return { r, s: await res.text(), sp: null, t: 'js' };
    else if (wasmContentType.test(contentType)) {
      const module = await (sourceCache[r] || (sourceCache[r] = WebAssembly.compileStreaming(res)));
      sourceCache[r] = module;
      let s = '',
        i = 0,
        importObj = '';
      for (const impt of WebAssembly.Module.imports(module)) {
        const specifier = urlJsString(impt.module);
        s += `import * as impt${i} from ${specifier};\n`;
        importObj += `${specifier}:impt${i++},`;
      }
      i = 0;
      s += `const instance = await WebAssembly.instantiate(importShim._s[${urlJsString(r)}], {${importObj}});\n`;
      for (const expt of WebAssembly.Module.exports(module)) {
        s += `export const ${expt.name} = instance.exports['${expt.name}'];\n`;
      }
      return { r, s, t: 'wasm' };
    } else if (jsonContentType.test(contentType))
      return { r, s: `export default ${await res.text()}`, sp: null, t: 'json' };
    else if (cssContentType.test(contentType)) {
      return {
        r,
        s: `var s=new CSSStyleSheet();s.replaceSync(${JSON.stringify(
        (await res.text()).replace(
          cssUrlRegEx,
          (_match, quotes = '', relUrl1, relUrl2) => `url(${quotes}${resolveUrl(relUrl1 || relUrl2, url)}${quotes})`
        )
      )});export default s;`,
        ss: null,
        t: 'css'
      };
    } else if (typescriptEnabled && tsContentType.test(contentType)) {
      const source = await res.text();
      // if we don't have a ts transform hook, try to load it
      if (!esmsTsTransform) {
        ({ transform: esmsTsTransform } = await import(tsTransform));
      }
      const transformed = esmsTsTransform(source, url);
      return { r, s: transformed || source, t: 'ts' };
    } else
      throw Error(
        `Unsupported Content-Type "${contentType}" loading ${url}${fromParent(parent)}. Modules must be served with a valid MIME type like application/javascript.`
      );
  }

  function isUnsupportedType(type) {
    if (
      (type === 'css' && !cssModulesEnabled) ||
      (type === 'json' && !jsonModulesEnabled) ||
      (type === 'wasm' && !wasmModulesEnabled) ||
      (type === 'ts' && !typescriptEnabled)
    )
      throw featErr(`${t}-modules`);
    return (
      (type === 'css' && true) ||
      (type === 'json' && true) ||
      (type === 'wasm' && !supportsWasmModules) ||
      type === 'ts'
    );
  }

  function getOrCreateLoad(url, fetchOpts, parent, source) {
    if (source && registry[url]) {
      let i = 0;
      while (registry[url + ++i]);
      url += i;
    }
    let load = registry[url];
    if (load) return load;
    registry[url] = load = {
      // url
      u: url,
      // response url
      r: source ? url : undefined,
      // fetchPromise
      f: undefined,
      // source
      S: source,
      // linkPromise
      L: undefined,
      // analysis
      a: undefined,
      // deps
      d: undefined,
      // blobUrl
      b: undefined,
      // shellUrl
      s: undefined,
      // needsShim
      n: false,
      // shouldShim
      N: false,
      // type
      t: null,
      // meta
      m: null
    };
    load.f = (async () => {
      if (!load.S) {
        // preload fetch options override fetch options (race)
        ({ r: load.r, s: load.S, t: load.t } = await (fetchCache[url] || fetchModule(url, fetchOpts, parent)));
        if (!load.n && load.t !== 'js' && !shimMode && isUnsupportedType(load.t)) {
          load.n = true;
        }
      }
      try {
        load.a = parse(load.S, load.u);
      } catch (e) {
        throwError(e);
        load.a = [[], [], false];
      }
      return load;
    })();
    return load;
  }

  const featErr = feat =>
    Error(
      `${feat} feature must be enabled via <script type="esms-options">{ "polyfillEnable": ["${feat}"] }<${''}/script>`
    );

  function linkLoad(load, fetchOpts) {
    if (load.L) return;
    load.L = load.f.then(async () => {
      let childFetchOpts = fetchOpts;
      load.d = (
        await Promise.all(
          load.a[0].map(async ({ n, d, t }) => {
            const sourcePhase = t >= 4;
            if (sourcePhase && !sourcePhaseEnabled) throw featErr('source-phase');
            if (
              (d >= 0 && !supportsDynamicImport) ||
              (d === -2 && !supportsImportMeta) ||
              (sourcePhase && !supportsSourcePhase)
            )
              load.n = true;
            if (d !== -1 || !n) return;
            const resolved = await resolve(n, load.r || load.u);
            if (resolved.n) load.n = true;
            if (d >= 0 || resolved.N) load.N = true;
            if (d !== -1) return;
            if (skip && skip(resolved.r) && !sourcePhase) return { l: { b: resolved.r }, s: false };
            if (childFetchOpts.integrity) childFetchOpts = Object.assign({}, childFetchOpts, { integrity: undefined });
            const child = { l: getOrCreateLoad(resolved.r, childFetchOpts, load.r, null), s: sourcePhase };
            if (!child.s) linkLoad(child.l, fetchOpts);
            // load, sourcePhase
            return child;
          })
        )
      ).filter(l => l);
    });
  }

  function processScriptsAndPreloads() {
    console.info(`es-module-shims: processing scripts`);
    for (const link of document.querySelectorAll(shimMode ? 'link[rel=modulepreload-shim]' : 'link[rel=modulepreload]')) {
      if (!link.ep) processPreload(link);
    }
    for (const script of document.querySelectorAll('script[type]')) {
      if (script.type === 'importmap' + (shimMode ? '-shim' : '')) {
        if (!script.ep) processImportMap(script);
      } else if (script.type === 'module' + (shimMode ? '-shim' : '')) {
        legacyAcceptingImportMaps = false;
        if (!script.ep) processScript(script);
      }
    }
  }

  function getFetchOpts(script) {
    const fetchOpts = {};
    if (script.integrity) fetchOpts.integrity = script.integrity;
    if (script.referrerPolicy) fetchOpts.referrerPolicy = script.referrerPolicy;
    if (script.fetchPriority) fetchOpts.priority = script.fetchPriority;
    if (script.crossOrigin === 'use-credentials') fetchOpts.credentials = 'include';
    else if (script.crossOrigin === 'anonymous') fetchOpts.credentials = 'omit';
    else fetchOpts.credentials = 'same-origin';
    return fetchOpts;
  }

  let lastStaticLoadPromise = Promise.resolve();

  let domContentLoadedCnt = 1;
  function domContentLoadedCheck() {
    if (--domContentLoadedCnt === 0 && !noLoadEventRetriggers && (shimMode || !baselinePassthrough)) {
      console.info(`es-module-shims: DOMContentLoaded refire`);
      document.dispatchEvent(new Event('DOMContentLoaded'));
    }
  }
  let loadCnt = 1;
  function loadCheck() {
    if (--loadCnt === 0 && !noLoadEventRetriggers && (shimMode || !baselinePassthrough)) {
      console.info(`es-module-shims: load refire`);
      window.dispatchEvent(new Event('load'));
    }
  }
  // this should always trigger because we assume es-module-shims is itself a domcontentloaded requirement
  if (hasDocument) {
    document.addEventListener('DOMContentLoaded', async () => {
      await initPromise;
      domContentLoadedCheck();
    });
    window.addEventListener('load', async () => {
      await initPromise;
      loadCheck();
    });
  }

  let readyStateCompleteCnt = 1;
  function readyStateCompleteCheck() {
    if (--readyStateCompleteCnt === 0 && !noLoadEventRetriggers && (shimMode || !baselinePassthrough)) {
      console.info(`es-module-shims: readystatechange complete refire`);
      document.dispatchEvent(new Event('readystatechange'));
    }
  }

  const hasNext = script => script.nextSibling || (script.parentNode && hasNext(script.parentNode));
  const epCheck = (script, ready) =>
    script.ep ||
    (!ready && ((!script.src && !script.innerHTML) || !hasNext(script))) ||
    script.getAttribute('noshim') !== null ||
    !(script.ep = true);

  function processImportMap(script, ready = readyStateCompleteCnt > 0) {
    if (epCheck(script, ready)) return;
    // we dont currently support external import maps in polyfill mode to match native
    if (script.src) {
      if (!shimMode) return;
      importMapSrc = true;
    }
    importMapPromise = importMapPromise
      .then(async () => {
        composedImportMap = resolveAndComposeImportMap(
          script.src ? await (await doFetch(script.src, getFetchOpts(script))).json() : JSON.parse(script.innerHTML),
          script.src || baseUrl,
          composedImportMap
        );
      })
      .catch(e => {
        console.log(e);
        if (e instanceof SyntaxError)
          e = new Error(`Unable to parse import map ${e.message} in: ${script.src || script.innerHTML}`);
        throwError(e);
      });
    if (!firstImportMap && legacyAcceptingImportMaps) importMapPromise.then(() => (firstImportMap = composedImportMap));
    if (!legacyAcceptingImportMaps && !multipleImportMaps) {
      multipleImportMaps = true;
      if (baselinePassthrough && !supportsMultipleImportMaps) {
        console.info(`es-module-shims: disabling baseline passthrough due to multiple import maps`);
        baselinePassthrough = false;
        if (hasDocument) attachMutationObserver();
      }
    }
    legacyAcceptingImportMaps = false;
  }

  function processScript(script, ready = readyStateCompleteCnt > 0) {
    if (epCheck(script, ready)) return;
    // does this load block readystate complete
    const isBlockingReadyScript = script.getAttribute('async') === null && readyStateCompleteCnt > 0;
    // does this load block DOMContentLoaded
    const isDomContentLoadedScript = domContentLoadedCnt > 0;
    const isLoadScript = loadCnt > 0;
    if (isLoadScript) loadCnt++;
    if (isBlockingReadyScript) readyStateCompleteCnt++;
    if (isDomContentLoadedScript) domContentLoadedCnt++;
    console.info(`es-module-shims: loading ${script.src || '<inline>'}`);
    const loadPromise = topLevelLoad(
      script.src || baseUrl,
      getFetchOpts(script),
      !script.src && script.innerHTML,
      !shimMode,
      isBlockingReadyScript && lastStaticLoadPromise
    ).catch(throwError);
    if (!noLoadEventRetriggers) loadPromise.then(() => script.dispatchEvent(new Event('load')));
    if (isBlockingReadyScript) lastStaticLoadPromise = loadPromise.then(readyStateCompleteCheck);
    if (isDomContentLoadedScript) loadPromise.then(domContentLoadedCheck);
    if (isLoadScript) loadPromise.then(loadCheck);
  }

  const fetchCache = {};
  function processPreload(link) {
    link.ep = true;
    if (fetchCache[link.href]) return;
    fetchCache[link.href] = fetchModule(link.href, getFetchOpts(link));
  }

})();
