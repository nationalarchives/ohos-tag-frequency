import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import lodashDebounce from 'https://cdn.jsdelivr.net/npm/lodash.debounce@4.0.8/+esm'

import { termsRange } from './process-sample-data.js';

function setCircleRadius(data, width, height, padding) {

  const scaleValue = 0.4;

  console.log({
    width,
    height,
    widthScaled: width * scaleValue,
    heightScaled: height * scaleValue,
  })

  const canvasArea = (width - (width * scaleValue)) * (height - (height * scaleValue));
  // const canvasArea = (width - (padding * 2)) * (height - (padding * 2));

  const countValues = data.map(d => d.count);

  const smallestValue = Math.min(...countValues);
  const largestValue = Math.max(...countValues);

  const scaleDataToRadius = d3.scaleSqrt()
    .domain([smallestValue, largestValue])
    .range([50, 85]);

  const dataMappedToRadius = data.map(d => scaleDataToRadius(d.count));

  const countValuesSquared = dataMappedToRadius.map(value => Math.pow(value, 2));

  const sumOfSquaredValues = countValuesSquared.reduce((acc, val) => acc + val, 0);

  const scalingFactor = canvasArea / sumOfSquaredValues;

  const scaledSquareAreas = countValuesSquared.map(value => value * scalingFactor);

  const scaledSquareDimensions = scaledSquareAreas.map(value => Math.sqrt(value));

  const getCircleRadius = (d, i) => scaledSquareDimensions[i] / 2;

  const mapCircleRadius = d3.map(data, getCircleRadius);

  const dataWithRadius = data.map((d, i) => {
    return {
      ...d,
      radius: mapCircleRadius[i],
    }
  });

  return dataWithRadius
}

function chartForceSimulation(data, options = {}) {

  const {
    width = 640, // outer width, in pixels
    height = 480, // outer height, in pixels
    padding = 150, // padding around chart area
    disableAnimation = true,
    container = null,
  } = options;

  const colorsMap = {
    LOC: "#EDAE49",
    PER: "#84A59D",
    ORG: "#B5E2FA",
    MISC: "#F28482",
    DATE: "#FAF0CA",
  };

  const svg = d3.create("svg")
    // .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", '100%')
    .attr("height", height)
    .attr("style", `max-width: ${width}px;`)
    .attr("font-size", 14)
    .attr("font-family", "sans-serif")
    .attr("text-anchor", "middle");


  const containerWidth = container.getBoundingClientRect().width;

  const dataWithRadius = setCircleRadius(data, containerWidth, height, padding);

  const urlParams = new URLSearchParams(window.location.search);

  const isSelectedItem = (term, type) => {
    const termParam = urlParams.get('term');
    const typeParam = urlParams.get('type');

    return term === termParam && type === typeParam;
  }

  const createHref = (term, type) => {
    if (urlParams.get('disableAnimation') === 'true') {
      return `?term=${term}&type=${type}&disableAnimation=true`;
    }

    return `?term=${term}&type=${type}`;
  }

  // Create a group for each circle and text element
  const node = svg.selectAll('a')
    .data(dataWithRadius)
    .join('a')
    .attr('xlink:href', d => createHref(d.term, d.type));

  // Append circle to each group
  const circle = node.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => colorsMap[d.type])
    .attr("stroke", d => isSelectedItem(d.term, d.type) ? '#1E1E1E' : '#8A8A8A')
    .attr("stroke-width", d => isSelectedItem(d.term, d.type) ? 5 : 1);

  // Append text to each group
  const text = node.append('text')
    .selectAll('tspan')
    .data(d => {
      const terms = d.term.split(/(?=[A-Z][a-z])/g);

      terms.push(`(${d.count.toLocaleString("en")})`);

      return terms;
    })
    .join('tspan')
    .attr('x', 0)
    .attr('y', (d, i, nodes) => `${i - nodes.length / 2 + 0.8}em`)
    .text(d => d)
    .join('tspan');

  const simulation = d3.forceSimulation(dataWithRadius)
    .force('center', d3.forceCenter(containerWidth / 2, height / 2))
    .force('charge', d3.forceManyBody().strength(5))
    .force('collision', d3.forceCollide().radius(d => d.radius + 5))

    if(containerWidth > height) {
      simulation.force('y', d3.forceY(height / 2).strength(0.03));
    } else {
      simulation.force('y', null);
    }


  if(disableAnimation === true) {
    simulation.stop().tick(300);
    node.attr('transform', d => `translate(${d.x}, ${d.y})`);
  } else {
    simulation.nodes(dataWithRadius)
      .on('tick', () => node.attr('transform', d => `translate(${d.x}, ${d.y})`));
  }

  function runSimulation(data) {
    simulation
      .nodes(data)
      .force('center', d3.forceCenter(containerWidth / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(5))
      .force('collision', d3.forceCollide().radius(d => d.radius + 5))

    if(containerWidth > height) {
      simulation.force('y', d3.forceY(height / 2).strength(0.03));
    } else {
      simulation.force('y', null);
    }


  if(disableAnimation === true) {
    simulation.stop().tick(300);
    node.attr('transform', d => `translate(${d.x}, ${d.y})`);
  } else {
    simulation.nodes(dataWithRadius)
      .on('tick', () => node.attr('transform', d => `translate(${d.x}, ${d.y})`));
  }
  }

  function updateSize() {
    const newWidth = svg.node().getBoundingClientRect().width;

    if (newWidth === containerWidth) return;

    const newDataWithRadius = setCircleRadius(data, newWidth, height, padding);

    node.data(newDataWithRadius)
      .select('circle')
      .attr('r', d => d.radius);

    simulation
      .nodes(newDataWithRadius)
      .force('center', d3.forceCenter(newWidth / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(5))
      .force('collision', d3.forceCollide().radius(d => d.radius + 5));

      if(newWidth > height) {
        simulation.force('y', d3.forceY(height / 2).strength(0.03));
      } else {
        simulation.force('y', null);
      }

    simulation.alpha(1).restart();
  }

  const containerResizeObserver = new ResizeObserver(lodashDebounce(updateSize, 500));

  containerResizeObserver.observe(container);

  return svg.node();
};


/**
 * Initialisation
 */
const disableAnimation = window.location.search.includes('disableAnimation=true');

const containerForceSimulation = document.getElementById('chart-force-simulation');

const chartCustom = chartForceSimulation(termsRange, {
  width: 1168,
  height: 550,
  disableAnimation,
  container: containerForceSimulation,
});

containerForceSimulation.appendChild(chartCustom);
