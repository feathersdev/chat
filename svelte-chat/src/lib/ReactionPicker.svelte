<script lang="ts">
  import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
  import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
  import EmojiPicker from './EmojiPicker.svelte';
  import { searchEmojis, getEmojiByName, type EmojiData } from './emoji-data';

  export let visible: boolean = false;
  export let referenceElement: HTMLElement | null = null;

  const dispatch = createEventDispatcher<{
    select: string; // emoji character
    close: void;
  }>();

  let selectedEmojiIndex: number = 0;
  let filteredEmojis: EmojiData[] = [];
  let searchQuery: string = '';
  let floatingElement: HTMLElement;
  let searchInputElement: HTMLInputElement;
  let cleanupAutoUpdate: (() => void) | null = null;
  let floatingPosition = { x: 0, y: 0 };

  // Show popular reactions by default (9 for a perfect 3x3 grid) - using emoji names
  const popularReactionNames = ['heart', 'thumbs_up', 'thumbs_down', 'laugh', 'cry', 'thinking', 'fire', 'clap', 'party'];
  
  $: {
    if (searchQuery.trim()) {
      filteredEmojis = searchEmojis(searchQuery);
    } else {
      // Show popular reactions first (9 emojis for perfect 3x3 grid)
      const popularEmojiData = popularReactionNames.map(name => {
        return getEmojiByName(name);
      }).filter(emoji => emoji !== undefined) as EmojiData[]; // Filter out any not found
      filteredEmojis = popularEmojiData;
    }
    selectedEmojiIndex = 0;
  }

  // Update position when visible changes or reference element changes (but avoid infinite loops)
  $: if (visible && referenceElement && floatingElement && !cleanupAutoUpdate) {
    updatePosition();
  }

  let isUpdating = false;
  let emojiGridElement: HTMLDivElement;

  // Ensure selected emoji is visible when using keyboard navigation
  $: if (selectedEmojiIndex >= 0 && emojiGridElement) {
    const selectedButton = emojiGridElement.children[selectedEmojiIndex] as HTMLElement;
    if (selectedButton) {
      selectedButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  async function updatePosition() {
    if (!referenceElement || !floatingElement || isUpdating) return;
    
    isUpdating = true;
    try {
      const { x, y } = await computePosition(referenceElement, floatingElement, {
        placement: 'bottom-start',
        middleware: [
          offset(5),
          flip(),
          shift({ padding: 10 })
        ]
      });

      // Only update if position actually changed to avoid unnecessary re-renders
      if (floatingPosition.x !== x || floatingPosition.y !== y) {
        floatingPosition = { x, y };
      }
    } finally {
      isUpdating = false;
    }
  }

  function selectEmoji(emoji: EmojiData) {
    dispatch('select', emoji.char);
    closeReactionPicker();
  }

  function closeReactionPicker() {
    visible = false;
    searchQuery = '';
    dispatch('close');
  }

  function getGridColumns(): number {
    if (!emojiGridElement) return 3;
    
    // Calculate actual number of columns based on the rendered grid
    const gridStyles = window.getComputedStyle(emojiGridElement);
    const gridTemplateColumns = gridStyles.gridTemplateColumns;
    
    // Count the number of columns by splitting the grid-template-columns value
    if (gridTemplateColumns && gridTemplateColumns !== 'none') {
      return gridTemplateColumns.split(' ').length;
    }
    
    return 3; // fallback
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!visible) return;

    const gridColumns = getGridColumns();
    const maxIndex = filteredEmojis.length - 1;
    const currentRow = Math.floor(selectedEmojiIndex / gridColumns);
    const currentCol = selectedEmojiIndex % gridColumns;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const newDownIndex = selectedEmojiIndex + gridColumns;
        selectedEmojiIndex = Math.min(newDownIndex, maxIndex);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        const newUpIndex = selectedEmojiIndex - gridColumns;
        selectedEmojiIndex = Math.max(newUpIndex, 0);
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        // Move right, wrapping to next row if at end of current row
        selectedEmojiIndex = Math.min(selectedEmojiIndex + 1, maxIndex);
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        // Move left, wrapping to previous row if at beginning of current row
        selectedEmojiIndex = Math.max(selectedEmojiIndex - 1, 0);
        break;
        
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        if (filteredEmojis[selectedEmojiIndex]) {
          selectEmoji(filteredEmojis[selectedEmojiIndex]);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        closeReactionPicker();
        break;
    }
  }

  let clickOutsideEnabled = false;

  function handleClickOutside(event: MouseEvent) {
    if (!clickOutsideEnabled) return;
    
    // Check if click is inside the picker
    const target = event.target as HTMLElement;
    const pickerContainer = target.closest('.reaction-picker-container');
    const emojiPicker = target.closest('.emoji-picker');
    
    if (!pickerContainer && !emojiPicker) {
      closeReactionPicker();
    }
  }

  onMount(() => {
    // Initialize with 9 popular reactions for perfect 3x3 grid
    filteredEmojis = popularReactionNames.map(name => {
      return getEmojiByName(name);
    }).filter(emoji => emoji !== undefined) as EmojiData[]; // Filter out any not found

    document.addEventListener('keydown', handleKeyDown);
    
    // Add click outside handler after next tick to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (cleanupAutoUpdate) {
        cleanupAutoUpdate();
      }
    };
  });

  afterUpdate(() => {
    if (visible && referenceElement && floatingElement && !cleanupAutoUpdate) {
      // Setup auto-update for scroll/resize events only once
      cleanupAutoUpdate = autoUpdate(referenceElement, floatingElement, updatePosition);
    } else if (!visible && cleanupAutoUpdate) {
      cleanupAutoUpdate();
      cleanupAutoUpdate = null;
    }
  });

  function handlePickerClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

{#if visible}

  <!-- Combined floating container - role="dialog" makes this interactive -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div 
    bind:this={floatingElement}
    class="reaction-picker-floating"
    style="left: {floatingPosition.x}px; top: {floatingPosition.y}px;"
    on:click={handlePickerClick}
    on:keydown={(e) => e.key === 'Escape' && closeReactionPicker()}
    role="dialog"
    aria-label="Reaction picker"
    tabindex="-1"
  >
    <!-- Search input -->
    <div class="reaction-picker-container">
      <input
        bind:this={searchInputElement}
        type="text"
        placeholder="Search reactions..."
        class="reaction-search"
        id="reaction-search-input"
        bind:value={searchQuery}
        autocomplete="off"
      />
    </div>

    <!-- Emoji grid -->
    <div bind:this={emojiGridElement} class="emoji-picker-container">
      {#each filteredEmojis as emoji, index}
        <button
          type="button"
          class="emoji-item"
          class:selected={selectedEmojiIndex === index}
          on:click={() => selectEmoji(emoji)}
          role="option"
          aria-selected={selectedEmojiIndex === index}
          tabindex="-1"
        >
          <span class="emoji-char">{emoji.char}</span>
          <span class="emoji-name">:{emoji.name}:</span>
        </button>
      {/each}
    </div>
  </div>

  <div 
    class="picker-backdrop" 
    on:click={closeReactionPicker}
    on:keydown={(e) => e.key === 'Escape' && closeReactionPicker()}
    role="button"
    tabindex="-1"
    aria-label="Close reaction picker"
  ></div>
{/if}

<style>
  .reaction-picker-floating {
    position: fixed;
    z-index: 10000;
    background: hsl(var(--b1));
    border: 1px solid hsl(var(--bc) / 0.2);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 280px;
    max-width: 320px;
  }

  .reaction-picker-container {
    border-bottom: 1px solid hsl(var(--bc) / 0.1);
  }

  .reaction-search {
    width: 100%;
    height: 40px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: none;
    border-radius: 8px 8px 0 0;
    background-color: transparent;
    color: hsl(var(--bc));
    outline: none;
  }

  .reaction-search:focus {
    background-color: hsl(var(--bc) / 0.05);
  }

  .emoji-picker-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 8px;
    max-height: 200px;
    overflow-y: auto;
  }

  .emoji-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.1s;
    min-height: 50px;
    width: 100%;
    box-sizing: border-box;
  }

  .emoji-item:hover,
  .emoji-item.selected {
    background-color: hsl(var(--bc) / 0.1);
  }

  .emoji-item.selected {
    background-color: hsl(var(--p) / 0.1);
    outline: 2px solid hsl(var(--p));
    outline-offset: -2px;
  }

  .emoji-char {
    font-size: 20px;
    line-height: 1;
  }

  .emoji-name {
    color: hsl(var(--bc) / 0.6);
    font-family: monospace;
    font-size: 9px;
    text-align: center;
    word-break: break-all;
    line-height: 1.2;
    max-width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .picker-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: transparent;
  }
</style>