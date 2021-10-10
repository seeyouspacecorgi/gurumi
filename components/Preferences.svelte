<script>
  import Abbrv from "./Preferences/Abbrv.svelte";
  import Colors from "./Preferences/Colors.svelte";

  let tabs = [
    { label: "abbrv", component: Abbrv },
    { label: "colors", component: Colors }
  ];
  let selected = tabs[0];

  export let is_visible = false;
</script>

{#if is_visible}
  <main>
    <header>
      {#each tabs as tab}
        <button on:click={() => selected = tab} selected={selected===tab} >{tab.label}</button>
      {/each}
      <button on:click={() => is_visible = false}>×</button>
    </header>
    <svelte:component this={selected.component}/>
  </main>
{/if}
<button on:click={() => is_visible = true}>Settings</button>

<style>
  main {
    position: absolute;
    background: var(--ui-background);
    padding: 2em;
    border: solid grey 1px;
    border-radius: 0.4em;
  }
</style>