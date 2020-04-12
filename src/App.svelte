<script>
  // svelte
  import {
    onMount
  } from 'svelte';

  const N = 30;
  let cards = [...Array(N).keys()].map(i => ('000' + (i + 1)).slice(-3));
  let reds = [];
  let blues = [];

  onMount(async () => {
    console.log("onMount");
  });

  function dragstart(e, target, i) {
    console.log("dragstart", i);
    let index = parseInt(target.getAttribute("index"));
    e.dataTransfer.setData("index", index);
  }

  function dragover(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function drop(e, target) {
    console.log("drop");
    e.preventDefault();

    let index = e.dataTransfer.getData("index");
    let moved = cards.splice(index, 1)[0];
    $: cards = cards;

    if (target.classList.contains("red")) {
      reds.push(moved);
      $: reds = reds;
    } else if (target.classList.contains("blue")) {
      blues.push(moved);
      $: blues = blues;
    }
  }
</script>

<style>
  .container {
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    margin: 0px;
    padding: 0px;
  }

  .flex {
    display: flex;
  }
  
  .half {
    flex: 0 0 50%;
  }

  .vertical {
    flex-direction: column;
  }

  .horizontal {
    flex-direction: row;
  }

  .wrap {
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: flex-start;
  }

  .center {
    align-items: center;
    justify-content: center;
  }

  .card {
    width: 50px;
    height: 50px;
    margin: 10px;
  }

  .border {
    border: 1px solid black;
  }

  .gray {
    background-color: #eee;
  }

  .red {
    background-color: #fdd;
  }

  .blue {
    background-color: #ddf;
  }
</style>


<div class="container flex vertical">
  <div class="half flex horizontal wrap">
    {#each cards as card, card_i}
    <div class="card border gray flex center" index={card_i} draggable={true}
      on:dragstart={e=> dragstart(e, e.target, card_i)}>
      {card}
    </div>
    {/each}
  </div>
  <div class="half flex horizontal">
    <div class="half red flex horizontal wrap"
      on:dragover={dragover}
      on:drop={e => drop(e, e.target)}>
      {#each reds as card, card_i}
      <div class="card border gray flex center" index="{card_i}">{card}</div>
      {/each}
    </div>
    <div class="half blue flex horizontal wrap"
      on:dragover={dragover}
      on:drop={e => drop(e, e.target)}>
      {#each blues as card, card_i}
      <div class="card border gray flex center" index="{card_i}">{card}</div>
      {/each}
    </div>
  </div>
</div>
