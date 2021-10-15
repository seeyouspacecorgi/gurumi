<script>
  export let pattern;

</script>

<section>
{#each pattern as step}
  {#each {length:step.times} as _, i}
    {#if step.type === 'repeat'}
      {#each step.stitches as st}
        {#each {length:st.times} as _, j}
          <i class="icon-{st.value}"></i>
        {/each}
      {/each}
    {:else}
      <i class="icon-{step.value}"></i>
    {/if}
  {/each}|
{/each}
</section>
