<script>
  import Preferences from "./components/Preferences.svelte";
  import View from "./components/View.svelte";
  import Editor from "./components/Editor.svelte";
  let pattern = [];
</script>

<main>
  <h1>Gurumi !</h1>
    <View bind:pattern/>
    <Editor bind:pattern/>
  <menu>
    <Preferences/>
  </menu>
</main>
<style global lang="postcss">
  @import "normalize.css";
  @import "./style.css";

  main {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem 1rem;
    height: 100vh;
    padding: 1rem;
    box-sizing: border-box;
  }

  h1 {
    grid-column: span 2;
    font-family: var(--font-highlight);
    font-size: 2.25em;
    text-align: center;
  }

  menu {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
  }
</style>
