<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { EmojiData } from './emoji-data';

  export let emojis: EmojiData[] = [];
  export let selectedIndex: number = 0;
  export let visible: boolean = false;
  export let position: { x: number; y: number } = { x: 0, y: 0 };

  const dispatch = createEventDispatcher<{
    select: EmojiData;
    close: void;
  }>();

  let pickerElement: HTMLDivElement;

  $: if (visible && pickerElement) {
    // Ensure selected item is visible
    const selectedItem = pickerElement.children[selectedIndex] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  function selectEmoji(emoji: EmojiData) {
    dispatch('select', emoji);
  }

  function handleClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

{#if visible && emojis.length > 0}
  <!-- Debug: visible={visible}, emojis.length={emojis.length}, position={JSON.stringify(position)} -->
  <div 
    bind:this={pickerElement}
    class="emoji-picker"
    style="left: {position.x}px; top: {position.y}px; height: {Math.min(200, (emojis.length * 36) + 8)}px;"
    on:click={handleClick}
    on:keydown={(e) => e.key === 'Escape' && dispatch('close')}
    role="listbox"
    tabindex="-1"
    aria-label="Emoji picker"
  >
    {#each emojis as emoji, index}
      <button
        type="button"
        class="emoji-item"
        class:selected={selectedIndex === index}
        on:click={() => selectEmoji(emoji)}
        role="option"
        aria-selected={selectedIndex === index}
        tabindex="-1"
      >
        <span class="emoji-char">{emoji.char}</span>
        <span class="emoji-name">:{emoji.name}:</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .emoji-picker {
    position: fixed;
    z-index: 9999;
    background: hsl(var(--b1));
    border: 1px solid hsl(var(--bc) / 0.2);
    border-radius: 0 0 8px 8px;
    border-top: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 200px;
    overflow-y: auto;
    min-width: 200px;
  }

  .emoji-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    border: none !important;
    background: transparent !important;
    background-color: transparent !important;
    border-bottom-color: transparent !important;
    cursor: pointer;
    font-size: 14px;
    text-align: left;
    transition: background-color 0.1s;
  }

  .emoji-item:hover {
    background: transparent !important;
    background-color: transparent !important;
    border-bottom-color: transparent !important;
  }

  .emoji-item.selected {
    background: transparent !important;
    background-color: transparent !important;
    border-bottom-color: transparent !important;
    outline: 2px solid hsl(var(--p));
    outline-offset: -2px;
  }

  .emoji-char {
    font-size: 18px;
    line-height: 1;
    background: transparent !important;
    background-color: transparent !important;
    padding: 0 !important;
  }

  .emoji-name {
    color: hsl(var(--bc) / 0.6);
    font-family: monospace;
    font-size: 12px;
    background: transparent !important;
    background-color: transparent !important;
    padding: 0 !important;
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .emoji-picker {
      background: hsl(var(--b1));
      border-color: hsl(var(--bc) / 0.2);
      color: hsl(var(--bc));
    }

    .emoji-item:hover {
      background-color: transparent;
    }

    .emoji-item.selected {
      background-color: transparent;
      outline: 2px solid hsl(var(--p));
      outline-offset: -2px;
    }

    .emoji-name {
      color: hsl(var(--bc) / 0.6);
    }
  }
</style>