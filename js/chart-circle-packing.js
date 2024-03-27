import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import { termsRange } from './process-sample-data.js';

// Copyright 2021-2023 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/bubble-chart
function BubbleChart(data, {
  label = d => `${d.term}\n${d.count.toLocaleString("en")}`, // given d in data, returns text to display on the bubble
  value = d => d.count, // given d in data, returns a quantitative size
  title = d => d.term, // given d in data, returns text to show on hover
  type = d => d.type, // given d in data, returns type
  link, // given a node d, its link (if any)
  linkTarget = "_blank", // the target attribute for links, if any
  width = 640, // outer width, in pixels
  height = width, // outer height, in pixels
  padding = 20, // padding between circles
  margin = 1, // default margins
  marginTop = margin, // top margin, in pixels
  marginRight = margin, // right margin, in pixels
  marginBottom = margin, // bottom margin, in pixels
  marginLeft = margin, // left margin, in pixels
} = {}) {

  const colorsMap = {
    LOC: "#EDAE49",
    PER: "#84A59D",
    ORG: "#B5E2FA",
    MISC: "#F28482",
    DATE: "#FAF0CA",
  };

  const fill = d => colorsMap[d.type];

  // Compute the values.
  const D = d3.map(data, d => d);
  const V = d3.map(data, value);
  // const G = group == null ? null : d3.map(data, group);
  const I = d3.range(V.length).filter(i => V[i] > 0);

  const F = typeof fill === 'string' ? fill : d3.map(data, fill);

  const TYPE = d3.map(data, type);

  // Compute labels and titles.
  const L = label == null ? null : d3.map(data, label);
  const T = title === undefined ? L : title == null ? null : d3.map(data, title);



  const pack = d3.pack()
    .size([width - marginLeft - marginRight, height - marginTop - marginBottom])
    .padding(padding);

  const root = d3.hierarchy({children: I})
     .sum(i =>  V[i]);

  pack(root);

  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-marginLeft, -marginTop, width, height])
      .attr("style", "max-width: 100%; height: auto;")
      .attr("fill", "currentColor")
      .attr("font-size", 14)
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "middle");

  const urlParams = new URLSearchParams(window.location.search);

  const createHref = (term, type) => {
    if (urlParams.get('disableAnimation') === 'true') {
      return `?term=${term}&type=${type}&disableAnimation=true`;
    }

    return `?term=${term}&type=${type}`;
  }

  const leaf = svg.selectAll("a")
    .data(root.leaves())
    .join("a")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("href", d => createHref(T[d.data], TYPE[d.data]))

  const isSelectedItem = (term, type) => {
    const termParam = urlParams.get('term');
    const typeParam = urlParams.get('type');

    return term === termParam && type === typeParam;
  }

  leaf.append("circle")
      .attr("stroke", d => isSelectedItem(T[d.data], TYPE[d.data]) ? '#1E1E1E' : '#8A8A8A')
      .attr("stroke-width", d => isSelectedItem(T[d.data], TYPE[d.data]) ? 5 : 1)
      .attr("fill", d => F[d.data] || fill)
      .attr("r", d => d.r);

  if (T) leaf.append("title")
      .text(d => T[d.data]);


  if (L) {
    // A unique identifier for clip paths (to avoid conflicts).
    const uid = `O-${Math.random().toString(16).slice(2)}`;

    leaf.append("clipPath")
        .attr("id", d => `${uid}-clip-${d.data}`)
        .append("circle")
        .attr("r", d => d.r);

    leaf.append("text")
        .attr("clip-path", d => `url(${new URL(`#${uid}-clip-${d.data}`, location)})`)
      .selectAll("tspan")
      .data(d => `${L[d.data]}`.split(/\n/g))
      .join("tspan")
        .attr("x", 0)
        .attr("y", (d, i, D) => `${i - D.length / 2 + 0.85}em`)
        .attr("fill-opacity", (d, i, D) => i === D.length - 1 ? 0.7 : null)
        .text(d => d);
  }

  return svg.node();
}

const chartCirclePack = BubbleChart(termsRange, {
  width: 1168,
  height: 550,
});

const containerCirclePack = document.getElementById('chart-circle-pack');

containerCirclePack.appendChild(chartCirclePack);
