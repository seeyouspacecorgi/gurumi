<script>
  import { colors } from "../../scripts/store.js";
  import ColorPicker from '../Inputs/ColorPicker.svelte';
  let show_picker;
  let currentswatch;

  const set_color = evt => {
    //TODO :sanitize input, check for duplicates;
    console.log("foo");
  };
  //TODO Implement color picker
</script>

<section>
  <div>
    {#each $colors.entries as [key, value], i}
      <button style='background:{value}' on:click={() => currentswatch = key}>{key}</button>
    {/each}
      <button>+</button>
  </div>
  <div>
    {#if currentswatch}
      <ColorPicker/>
      <input type="text" value={currentswatch}/>
    {/if}
  </div>
</section>

<style>
  section {
    display: flex;
    justify-content: space-around;
    padding: 1rem;
  }
  button {
    width: 4rem;
    height: 4rem;
    padding: 0.5rem;
    font-size: 0.9em;
    line-height: 1rem;
    border-radius: 0.25rem;
    margin: 0.25rem;
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ".";
    white-space: nowrap;
    color: transparent;
  }
  button:hover {
    color: inherit;
  }
  button:last-of-type {
    border-style: dashed;
    color: inherit;
    font-size: 1.25rem;
  }
</style>
