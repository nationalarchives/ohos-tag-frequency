import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import lodashDebounce from 'https://cdn.jsdelivr.net/npm/lodash.debounce@4.0.8/+esm'

import { termsRange } from './process-sample-data.js';

/**
 * setCircleRadius
 *
 * @param {Array} data
 * @param {Number} width
 * @param {Number} height
 * @returns {Array}
 */
function setCircleRadius(data, width, height) {

  /**
   * Amount to scale the area of the canvas by
   */
  const scaleAreaValue = 0.4;

  /**
   * Area of the canvas, scaled down to allow for spacing around the circles
   */
  const scaledCanvasArea = width * height * scaleAreaValue;

  /**
   * Map data to an array of count values
   *
   * @returns {Array}
   */
  const countValues = data.map(d => d.count);

  /**
   * Get smallest count value, to make it possible to create a range between the smallest and largest values
   */
  const smallestValue = Math.min(...countValues);

  /**
   * Get largest count value, to make it possible to create a range between the smallest and largest values
   */
  const largestValue = Math.max(...countValues);

  /**
   * Normalise the range of the count values
   * @returns {Function}
   */
  const normaliseRange = d3.scaleSqrt()
    .domain([smallestValue, largestValue])
    .range([50, 85]);

  /**
   * Convert the countValues to scaled radius values
   * @returns {Array}
   */
  const dataMappedToRadius = countValues.map(d => normaliseRange(d));

  /**
   * Square the radius values to get their area
   * @returns {Array}
   */
  const circleAreas = dataMappedToRadius.map(value => Math.pow(value, 2));

  /**
   * Add each value together to get the total area
   * @returns {Number}
   */
  const sumOfSquaredValues = circleAreas.reduce((acc, val) => acc + val, 0);

  /**
   * Calculate the scaling factor to apply to the area of each circle
   */
  const scalingFactor = scaledCanvasArea / sumOfSquaredValues;

  /**
   * Scale the area of each circle to fit the canvas
   * @returns {Array}
   */
  const scaledSquareAreas = circleAreas.map(value => value * scalingFactor);

  /**
   * Get the square root of the scaled area values to get the dimensions of the circles
   */
  const scaledCircleRadius = scaledSquareAreas.map(value => Math.sqrt(value) / 2);

  /**
   * Function to get the radius of the circle from the `scaledCircleRadius` array
   * @param {Array} d Data
   * @param {Number} i Index
   * @returns
   */
  const getCircleRadius = (i) => scaledCircleRadius[i];

  /**
   * Map the data to include the radius value
   * @returns {Array}
   */
  const dataWithRadius = data.map((d, i) => {
    return {
      ...d,
      radius: getCircleRadius(i),
    }
  });

  return dataWithRadius
}

function chartForceSimulation(data, options = {}) {

  const {
    height = 480, // outer height, in pixels
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
    .attr("width", '100%')
    .attr("height", height)
    .attr("font-size", 14)
    .attr("font-family", "sans-serif")
    .attr("text-anchor", "middle");


  const containerWidth = container.getBoundingClientRect().width;

  const dataWithRadius = setCircleRadius(data, containerWidth, height);

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

  const simulation = d3.forceSimulation(dataWithRadius);

  function triggerForceSimulation(data, width, height) {
    simulation
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(5))
      .force('collision', d3.forceCollide().radius(d => d.radius + 5))

      if(width > height) {
        simulation.force('y', d3.forceY(height / 2).strength(0.03));
      } else {
        simulation.force('y', null);
      }


    if(disableAnimation === true) {
      simulation.stop().tick(300);
      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
    } else {
      simulation.nodes(data)
        .on('tick', () => node.attr('transform', d => `translate(${d.x}, ${d.y})`));
    }

    return simulation;
  }

  triggerForceSimulation(dataWithRadius, containerWidth, height);

  function updateSize() {
    const newWidth = svg.node().getBoundingClientRect().width;

    if (newWidth === containerWidth) return;

    const newDataWithRadius = setCircleRadius(data, newWidth, height);

    node.data(newDataWithRadius)
      .select('circle')
      .attr('r', d => d.radius);

    simulation
      .nodes(newDataWithRadius)

    triggerForceSimulation(newDataWithRadius, newWidth, height);

    simulation.alpha(1).restart();
  }

  const containerResizeObserver = new ResizeObserver(lodashDebounce(updateSize, 250));

  containerResizeObserver.observe(container);

  return svg.node();
};


/**
 * Initialisation
 */
const disableAnimation = window.location.search.includes('disableAnimation=true');

const containerForceSimulation = document.getElementById('chart-force-simulation');

const chartCustom = chartForceSimulation(termsRange, {
  height: 550,
  disableAnimation,
  container: containerForceSimulation,
});

containerForceSimulation.appendChild(chartCustom);
