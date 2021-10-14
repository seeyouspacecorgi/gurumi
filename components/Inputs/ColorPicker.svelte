<script>
  import { hsv2hex, hex2hsv } from '../../scripts/colorconversion.js';
  let hsv = { h: 0, s: 0, v: 100 };
  let hex = hsv2hex(hsv);

  let rect;
  const start_drag = evt => {
    rect = evt.target.getBoundingClientRect();
  }
  const move_drag = evt => {
    if(!rect) return;
    hsv.s = Math.round(Math.max(Math.min(((evt.clientX - rect.left) * 100) / rect.width, 100), 0));
    hsv.v = 100 - Math.round(Math.max(Math.min(((evt.clientY - rect.top) * 100) / rect.height, 100), 0));
    // update();
  }
  const stop_drag = evt => {
    rect = null;
  }

  const update = _ => {
    hex = hsv2hex(hsv);
  }
  $: hsv = hex2hsv(hex);

</script>

<div class="picker" style="--hex:{hex};--hue:{hsv.h};--saturation:{hsv.s}%;--value:{100-hsv.v}%;">
  <div class="shades" on:mousedown={start_drag}></div>
  <input class="hues" type="range" orient="vertical" min=0 max=360 bind:value={hsv.h} on:input={update}/>
  <br/><label>HEX: <input class="hex" type="text" bind:value={hex}/></label>
</div>
<svelte:window on:mousemove={move_drag} on:mouseup={stop_drag} on:mouseleave={stop_drag}/>

<style>
.picker {
  width:max-content;
}
.shades {
  display:inline-block;
  position:relative;
  width: 12em;
  height: 12em;
  background-color: hsl(var(--hue), 100%, 50%);
  background-image: linear-gradient(transparent, black),
      linear-gradient(to left, transparent, white);
  border-radius: 0.125em;
}
.shades:before{
    content:'';
    position: absolute;
    width: 1em;
    height: 1em;
    top: var(--value);
    left: var(--saturation);
    transform: translate(-50%, -50%);
    background: var(--hex);
    outline: solid white 2px;
    border-radius: 50%;
  }
.hues {
  width: 0.75em;
  height: 12em;
  color: hsl(var(--hue), 100%, 50%);
  background: linear-gradient(to top,
    #ff0000,
    #ffff00,
    #00ff00,
    #00ffff,
    #0000ff,
    #ff00ff,
    #ff0000
  );
  -webkit-appearance: slider-vertical;
}
</style>
