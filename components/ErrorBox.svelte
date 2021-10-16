<script>
  export let text = 'Oooops';
</script>

{#if text}
  <div>(⊙﹏⊙) {text}</div>
{/if}

<style>
  div {
    margin: 1rem 0 1.25rem 0;
    font-size: 0.8em;
    color: var(--red);
  }
</style>
