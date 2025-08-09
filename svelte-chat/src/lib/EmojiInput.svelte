<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import EmojiPicker from './EmojiPicker.svelte';
  import { searchEmojis, getEmojiByName, type EmojiData } from './emoji-data';

  export let value: string = '';
  export let placeholder: string = '';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    input: string;
    submit: string;
  }>();

  let inputElement: HTMLInputElement;
  let showPicker: boolean = false;
  let pickerPosition = { x: 0, y: 0 };
  let selectedEmojiIndex: number = 0;
  let filteredEmojis: EmojiData[] = [];
  let emojiQuery: string = '';
  let emojiStartPos: number = -1;

  // Process text for emoji replacements on input
  function processEmojiReplacements(text: string): string {
    // Replace :emoji_name: with actual emoji
    return text.replace(/:([a-zA-Z_]+):/g, (match, name) => {
      const emoji = getEmojiByName(name);
      return emoji ? emoji.char : match;
    });
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    let newValue = target.value;
    
    // Process emoji replacements
    const processedValue = processEmojiReplacements(newValue);
    if (processedValue !== newValue) {
      value = processedValue;
      target.value = processedValue;
      // Dispatch the processed value
      dispatch('input', processedValue);
      return;
    }

    value = newValue;
    dispatch('input', newValue);

    // Check for emoji trigger
    checkEmojiTrigger();
  }

  function checkEmojiTrigger() {
    if (!inputElement) return;

    const cursorPos = inputElement.selectionStart || 0;
    const text = value;
    
    // Find the last : before cursor position
    let colonPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === ':') {
        colonPos = i;
        break;
      }
      if (text[i] === ' ' || text[i] === '\n') {
        break; // Stop at word boundary
      }
    }

    if (colonPos !== -1) {
      // Extract query between : and cursor
      const query = text.substring(colonPos + 1, cursorPos);
      
      // Only show picker if query doesn't contain spaces or special chars
      if (!/[\s\n]/.test(query)) {
        emojiStartPos = colonPos;
        emojiQuery = query;
        filteredEmojis = searchEmojis(query);
        selectedEmojiIndex = 0;
        
        if (filteredEmojis.length > 0) {
          showPicker = true;
          updatePickerPosition();
          console.log('Showing emoji picker:', { query, filteredEmojis: filteredEmojis.length, showPicker });
        } else {
          closePicker();
          console.log('No emojis found for query:', query);
        }
      } else {
        closePicker();
      }
    } else {
      closePicker();
    }
  }

  function updatePickerPosition() {
    if (!inputElement) return;

    const rect = inputElement.getBoundingClientRect();
    const itemHeight = 36; // More accurate height per emoji item (8px padding top/bottom + ~20px content)
    const padding = 8; // Reduced picker padding
    const dynamicHeight = Math.min(200, (filteredEmojis.length * itemHeight) + padding); // Dynamic height based on items
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If not enough space below, open upward
    const openUpward = spaceBelow < dynamicHeight + 10 && spaceAbove > dynamicHeight;

    pickerPosition = {
      x: rect.left,
      y: openUpward ? rect.top - dynamicHeight - 5 : rect.bottom + 5
    };

    console.log('Picker position:', pickerPosition, 'openUpward:', openUpward, 'dynamicHeight:', dynamicHeight, 'items:', filteredEmojis.length);
  }

  function closePicker() {
    showPicker = false;
    filteredEmojis = [];
    emojiQuery = '';
    emojiStartPos = -1;
  }

  function insertEmoji(emoji: EmojiData) {
    if (emojiStartPos === -1) return;

    const beforeEmoji = value.substring(0, emojiStartPos);
    const afterEmoji = value.substring(emojiStartPos + 1 + emojiQuery.length);
    const newValue = beforeEmoji + emoji.char + afterEmoji;
    
    value = newValue;
    dispatch('input', newValue);
    
    // Set cursor position after emoji
    setTimeout(() => {
      const newCursorPos = emojiStartPos + emoji.char.length;
      inputElement.setSelectionRange(newCursorPos, newCursorPos);
      inputElement.focus();
    }, 0);

    closePicker();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (showPicker) {
      // Handle emoji picker navigation
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          selectedEmojiIndex = Math.min(selectedEmojiIndex + 1, filteredEmojis.length - 1);
          break;
          
        case 'ArrowUp':
          event.preventDefault();
          selectedEmojiIndex = Math.max(selectedEmojiIndex - 1, 0);
          break;
          
        case 'Enter':
        case 'Tab':
          event.preventDefault();
          if (filteredEmojis[selectedEmojiIndex]) {
            insertEmoji(filteredEmojis[selectedEmojiIndex]);
          }
          break;
          
        case 'Escape':
          event.preventDefault();
          closePicker();
          break;
          
        case 'Backspace':
          // Let the normal backspace happen, then check if we should close picker
          setTimeout(() => {
            if (emojiStartPos !== -1) {
              const cursorPos = inputElement.selectionStart || 0;
              if (cursorPos <= emojiStartPos) {
                closePicker();
              }
            }
          }, 0);
          break;
      }
    } else {
      // Handle normal input behavior
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          dispatch('submit', value);
          break;
      }
    }
  }

  function handleClickOutside() {
    closePicker();
  }

  onMount(() => {
    // Close picker when clicking outside
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  function handleInputClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<div class="emoji-input-container">
  
  <input
    bind:this={inputElement}
    bind:value={value}
    {placeholder}
    {disabled}
    class="emoji-input"
    on:input={handleInput}
    on:keydown={handleKeyDown}
    on:click={handleInputClick}
  />

  <EmojiPicker
    emojis={filteredEmojis}
    selectedIndex={selectedEmojiIndex}
    visible={showPicker}
    position={pickerPosition}
    on:select={(e) => insertEmoji(e.detail)}
    on:close={closePicker}
  />
</div>

{#if showPicker}
  <div 
    class="picker-backdrop" 
    on:click={closePicker}
    on:keydown={(e) => e.key === 'Escape' && closePicker()}
    role="button"
    tabindex="-1"
    aria-label="Close emoji picker"
  ></div>
{/if}

<style>
  .emoji-input-container {
    position: relative;
    width: 100%;
  }

  .emoji-input {
    /* Match DaisyUI input styles manually */
    width: 100%;
    height: 3rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    border: 1px solid hsl(var(--bc) / 0.2);
    border-radius: 0.5rem;
    background-color: hsl(var(--b1));
    color: hsl(var(--bc));
    outline: none;
    transition: border-color 0.2s;
  }

  .emoji-input:focus {
    border-color: hsl(var(--p));
    outline: 2px solid hsl(var(--p) / 0.2);
    outline-offset: 2px;
  }

  .picker-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    background: transparent;
  }
</style>