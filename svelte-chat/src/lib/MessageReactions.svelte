<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Reaction } from '../utils';

  export let reactions: Reaction[] = [];
  export let currentUserId: string;

  const dispatch = createEventDispatcher<{
    addReaction: { emoji: string };
    removeReaction: { emoji: string };
    toggleReactionPicker: { event: MouseEvent };
  }>();

  // Check if current user has reacted with a specific emoji
  function hasUserReacted(reaction: Reaction): boolean {
    return reaction.users.includes(currentUserId);
  }

  // Toggle reaction for current user
  function toggleReaction(emoji: string) {
    const reaction = reactions.find(r => r.emoji === emoji);
    if (reaction && hasUserReacted(reaction)) {
      dispatch('removeReaction', { emoji });
    } else {
      dispatch('addReaction', { emoji });
    }
  }

  // Get tooltip text for reaction
  function getReactionTooltip(reaction: Reaction): string {
    const count = reaction.users.length;
    if (count === 1) {
      return hasUserReacted(reaction) ? 'You reacted' : '1 person reacted';
    } else if (count === 2 && hasUserReacted(reaction)) {
      return 'You and 1 other reacted';
    } else if (hasUserReacted(reaction)) {
      return `You and ${count - 1} others reacted`;
    } else {
      return `${count} people reacted`;
    }
  }

  // Filter out reactions with no users
  $: visibleReactions = reactions.filter(r => r.users.length > 0);
  $: hasReactions = visibleReactions.length > 0;
</script>

{#if hasReactions || true}
  <div class="message-reactions">
    <!-- Existing reactions -->
    {#each visibleReactions as reaction (reaction.emoji)}
      <button
        type="button"
        class="reaction-button"
        class:user-reacted={hasUserReacted(reaction)}
        on:click={() => toggleReaction(reaction.emoji)}
        title={getReactionTooltip(reaction)}
        aria-label="{getReactionTooltip(reaction)} with {reaction.emoji}"
      >
        <span class="reaction-emoji">{reaction.emoji}</span>
        <span class="reaction-count">{reaction.users.length}</span>
      </button>
    {/each}

    <!-- Add reaction button (only show if no reactions or always for now) -->
    <button
      type="button"
      class="add-reaction-button"
      on:click={(event) => dispatch('toggleReactionPicker', { event })}
      aria-label="Add reaction"
      title="Add reaction"
    >
      <span class="add-reaction-icon">😊</span>
    </button>
  </div>
{/if}

<style>
  .message-reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.5rem;
    align-items: center;
  }

  .reaction-button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid hsl(var(--bc) / 0.2);
    border-radius: 1rem;
    background: hsl(var(--b1));
    color: hsl(var(--bc));
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.1s;
    min-height: 24px;
  }

  .reaction-button:hover {
    border-color: hsl(var(--bc) / 0.3);
    background: hsl(var(--bc) / 0.05);
  }

  .reaction-button.user-reacted {
    border-color: hsl(var(--p));
    background: hsl(var(--p) / 0.1);
    color: hsl(var(--p));
  }

  .reaction-button.user-reacted:hover {
    background: hsl(var(--p) / 0.15);
  }

  .reaction-emoji {
    font-size: 0.875rem;
    line-height: 1;
  }

  .reaction-count {
    font-size: 0.75rem;
    font-weight: 500;
    min-width: 1ch;
  }

  .add-reaction-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid hsl(var(--bc) / 0.2);
    border-radius: 50%;
    background: hsl(var(--b1));
    cursor: pointer;
    transition: all 0.1s;
    opacity: 0.7;
  }

  .add-reaction-button:hover {
    opacity: 1;
    border-color: hsl(var(--p));
    background: hsl(var(--p) / 0.1);
  }

  .add-reaction-icon {
    font-size: 0.75rem;
    line-height: 1;
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .reaction-button {
      background: hsl(var(--b1));
      border-color: hsl(var(--bc) / 0.2);
    }

    .reaction-button:hover {
      background: hsl(var(--bc) / 0.05);
    }

    .add-reaction-button {
      background: hsl(var(--b1));
      border-color: hsl(var(--bc) / 0.2);
    }
  }
</style>