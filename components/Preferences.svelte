<script>
  import Abbrv from "./Preferences/Abbrv.svelte";
  import Colors from "./Preferences/Colors.svelte";

  let tabs = [
    { label: "abbrv.", component: Abbrv },
    { label: "colors", component: Colors }
  ];
  let selected = tabs[0];

  export let is_visible = false;
</script>

{#if is_visible}
  <section>
      <header>
        {#each tabs as tab}
          <button on:click={() => selected = tab} class:selected={selected===tab} >{tab.label}</button>
        {/each}
        <button on:click={() => is_visible = false}>×</button>
      </header>
      <div>
        <svelte:component this={selected.component}/>
      </div>
  </section>
{/if}
<button on:click={() => is_visible = true}>Settings</button>

<style>
  section {
    position: fixed;
    left: 4rem;
    right: 4rem;
    top: 4rem;
    bottom: 4rem;
    margin: auto;
    max-width: 640px;
    background-color: var(--ui-background);
    box-shadow: inset 0 0 0 2px var(--ui-border);
    border-radius: 0.25rem;
    z-index: 100;
  }
  section:before {
    content: '';
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: -1;
  }
  @media (max-width: 640px) {
    section {
      left: 0.25rem;
      right: 0.25rem;
      top: 0.25rem;
      bottom: 0.25rem;
    }
  }
  header {
    display:flex;
    font-family: var(--font-highlight);
    border-bottom: solid black 2px;
  }
  header button {
    padding: 0.25rem 1em;
    border: solid black 2px;
    border-radius: 0.25rem 0.25rem 0 0;
    margin-bottom:-2px;
  }
  header button:not(:first-of-type) {
    margin-left:-2px;
  }
  header button.selected {
    border-bottom-color: white;
  }
  header button:last-of-type {
    margin-left: auto;
    border-color: transparent;
    font-size: 1.25rem;
    padding: 0 0.75rem;
  }
</style>
