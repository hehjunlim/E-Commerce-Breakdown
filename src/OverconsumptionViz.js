import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function EcommerceOverconsumption() {
  // State for each CSV's processed data
  const [salesData, setSalesData] = useState([]);         // E-commerce sales over time
  const [loansData, setLoansData] = useState([]);         // Consumer loans over time
  const [percentData, setPercentData] = useState([]);     // E-commerce % of total retail
  const [foundingData, setFoundingData] = useState([]);   // Company founding dates
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Refs to each D3 chart container
  const growthChartRef = useRef(null);     // 1) Growth of E-commerce vs Consumer Loans
  const percentChartRef = useRef(null);    // 2) E-commerce Share of Total Retail
  const timelineChartRef = useRef(null);   // 3) Company Founding Timeline with Sales Overlay

  /**
   * Parse CSV content manually without external library
   */
  const parseCSV = (csvContent, delimiter = ",") => {
    const lines = csvContent.split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(delimiter).map(header => header.trim());
    
    return lines.slice(1).filter(line => line.trim().length > 0).map(line => {
      const values = line.split(delimiter);
      const entry = {};
      
      headers.forEach((header, i) => {
        entry[header] = values[i] ? values[i].trim() : '';
      });
      
      return entry;
    });
  };

  /**
   * Load and process all CSV data
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all CSV files
        const foundingResponse = await d3.csv(process.env.PUBLIC_URL + '/data/foundingDates.csv');
        const processedFoundingData = foundingResponse.map(d => ({
          company: d.company,
          foundedDate: new Date(d.founded_date)
        }));
        setFoundingData(processedFoundingData);

        // Load and process loans data using d3's DSV parser for semicolon delimiter
        const loansResponse = await d3.dsv(';', process.env.PUBLIC_URL + '/data/loans.csv');
        const processedLoansData = loansResponse.map(d => ({
          date: new Date(d.observation_date),
          value: parseFloat(d.CCLACBW027SBOG.replace(',', '.'))
        }));
        setLoansData(processedLoansData);

        // Load and process percent of total data
        const percentResponse = await d3.dsv(';', process.env.PUBLIC_URL + '/data/percentOfTotal.csv');
        const processedPercentData = percentResponse.map(d => ({
          date: new Date(d.observation_date),
          value: parseFloat(d.ECOMPCTSA.replace(',', '.'))
        }));
        setPercentData(processedPercentData);

        // Load and process retail sales data
        const salesResponse = await d3.dsv(';', process.env.PUBLIC_URL + '/data/retailSales.csv');
        const processedSalesData = salesResponse.map(d => ({
          date: new Date(d.observation_date),
          value: parseFloat(d.ECOMSA)
        }));
        setSalesData(processedSalesData);

        setIsDataLoaded(true);
      } catch (error) {
        console.error('Error loading and processing CSV data:', error);
      }
    };

    loadData();
  }, []);

  /**
   * VISUALIZATION 1: E-commerce Sales vs Consumer Loans Growth
   * This shows the parallel growth of e-commerce sales and consumer loans
   */
  useEffect(() => {
    if (!isDataLoaded || !salesData.length || !loansData.length) return;

    // Clear previous chart
    d3.select(growthChartRef.current).selectAll('*').remove();

    // Chart dimensions
    const width = 800;
    const height = 400;
    const margin = { top: 50, right: 100, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select(growthChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Chart title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Parallel Growth of E-commerce Sales and Consumer Loans');

    // Create chart group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale (time)
    const xScale = d3.scaleTime()
      .domain(d3.extent([
        ...salesData.map(d => d.date),
        ...loansData.map(d => d.date)
      ]))
      .range([0, innerWidth]);

    // Y scales (separate for each dataset)
    const yScaleSales = d3.scaleLinear()
      .domain([0, d3.max(salesData, d => d.value) * 1.1])
      .range([innerHeight, 0]);

    const yScaleLoans = d3.scaleLinear()
      .domain([0, d3.max(loansData, d => d.value) * 1.1])
      .range([innerHeight, 0]);

    // Line generators
    const salesLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScaleSales(d.value))
      .curve(d3.curveMonotoneX);

    const loansLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScaleLoans(d.value))
      .curve(d3.curveMonotoneX);

    // Add sales line 
    g.append('path')
      .datum(salesData)
      .attr('fill', 'none')
      .attr('stroke', '#2980b9')
      .attr('stroke-width', 3)
      .attr('d', salesLine);

    // Add loans line
    g.append('path')
      .datum(loansData)
      .attr('fill', 'none')
      .attr('stroke', '#e74c3c')
      .attr('stroke-width', 3)
      .attr('d', loansLine);

    // X axis with more space for labels
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y')))
      .selectAll('text')
      .attr('dy', '1em') // Add more space between axis and text
      .style('font-size', '12px');

    // Left Y axis (Sales)
    g.append('g')
      .call(d3.axisLeft(yScaleSales))
      .selectAll('text')
      .style('font-size', '12px');

    // Right Y axis (Loans)
    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yScaleLoans))
      .selectAll('text')
      .style('font-size', '12px');

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Year');

    // Left Y axis label (Sales)
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('E-commerce Sales ($ millions)');

    // Right Y axis label (Loans)
    g.append('text')
      .attr('transform', 'rotate(90)')
      .attr('x', innerHeight / 2)
      .attr('y', -innerWidth - 60)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Consumer Loans ($ billions)');

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right + 10}, ${margin.top})`);

    // Sales legend
    legend.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 20)
      .attr('y2', 0)
      .attr('stroke', '#2980b9')
      .attr('stroke-width', 3);

    legend.append('text')
      .attr('x', 25)
      .attr('y', 5)
      .text('E-commerce Sales')
      .style('font-size', '12px');

    // Loans legend
    legend.append('line')
      .attr('x1', 0)
      .attr('y1', 20)
      .attr('x2', 20)
      .attr('y2', 20)
      .attr('stroke', '#e74c3c')
      .attr('stroke-width', 3);

    legend.append('text')
      .attr('x', 25)
      .attr('y', 25)
      .text('Consumer Loans')
      .style('font-size', '12px');

    // Add annotation for the parallel growth
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-style', 'italic')
      .text('Note: The similar growth trends suggest a correlation between e-commerce and consumer debt');

  }, [isDataLoaded, salesData, loansData]);

  /**
   * VISUALIZATION 2: E-commerce Share of Total Retail
   * Shows the increasing market share of e-commerce over time
   */
  useEffect(() => {
    if (!isDataLoaded || !percentData.length) return;

    // Clear previous chart
    d3.select(percentChartRef.current).selectAll('*').remove();

    // Chart dimensions
    const width = 800;
    const height = 400;
    const margin = { top: 50, right: 50, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select(percentChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Chart title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Growing Market Share of E-commerce in Total Retail Sales');

    // Create chart group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale (time)
    const xScale = d3.scaleTime()
      .domain(d3.extent(percentData, d => d.date))
      .range([0, innerWidth]);

    // Y scale (percent)
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(percentData, d => d.value) * 1.1])
      .range([innerHeight, 0]);

    // Area generator
    const area = d3.area()
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add area
    g.append('path')
      .datum(percentData)
      .attr('fill', 'rgba(52, 152, 219, 0.6)')
      .attr('d', area);

    // Line generator
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add line
    g.append('path')
      .datum(percentData)
      .attr('fill', 'none')
      .attr('stroke', '#2980b9')
      .attr('stroke-width', 3)
      .attr('d', line);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y')))
      .selectAll('text')
      .style('font-size', '12px');

    // Y axis with percentage format
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => d + '%'))
      .selectAll('text')
      .style('font-size', '12px');

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Year');

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Percentage of Total Retail Sales');

    // Add key events markers
    const keyEvents = [
      { date: new Date('2005-07-15'), event: 'Amazon Prime Launch', y: -10 },
      { date: new Date('2007-06-29'), event: 'iPhone Launch', y: -30 },
      { date: new Date('2011-10-01'), event: 'Mobile Shopping Boom', y: -10 },
      { date: new Date('2020-03-11'), event: 'COVID-19 Pandemic', y: -30 }
    ];

    // Filter events that are within our date range
    const filteredEvents = keyEvents.filter(event => {
      const dateRange = d3.extent(percentData, d => d.date);
      return event.date >= dateRange[0] && event.date <= dateRange[1];
    });

    // Add event markers
    filteredEvents.forEach(event => {
      if (xScale(event.date) >= 0 && xScale(event.date) <= innerWidth) {
        // Vertical line
        g.append('line')
          .attr('x1', xScale(event.date))
          .attr('x2', xScale(event.date))
          .attr('y1', innerHeight)
          .attr('y2', 0)
          .attr('stroke', 'rgba(231, 76, 60, 0.5)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');

        // Event label
        g.append('text')
          .attr('x', xScale(event.date))
          .attr('y', event.y)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .text(event.event);
      }
    });

    // Add annotation for consumer behavior
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-style', 'italic')
      .text('Note: As e-commerce becomes more accessible, consumer spending habits shift toward online purchases');

  }, [isDataLoaded, percentData]);

  /**
   * VISUALIZATION 3: Company Timeline with E-commerce Growth
   * Shows founding dates of major e-commerce companies alongside sales growth
   */
  useEffect(() => {
    if (!isDataLoaded || !foundingData.length || !salesData.length) return;

    // Clear previous chart
    d3.select(timelineChartRef.current).selectAll('*').remove();

    // Chart dimensions - increased bottom margin for phase labels
    const width = 800;
    const height = 550; // Increased height
    const margin = { top: 80, right: 50, bottom: 120, left: 80 }; // Increased bottom margin
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select(timelineChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Chart title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('E-commerce Company Timeline and Sales Growth');

    // Subtitle
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 55)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-style', 'italic')
      .text('How major platforms have shaped and accelerated online consumption');

    // Create chart group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Get combined date range
    const allDates = [
      ...salesData.map(d => d.date),
      ...foundingData.map(d => d.foundedDate)
    ];
    
    // Add some padding to the timeline start
    const minDate = new Date(d3.min(allDates));
    minDate.setFullYear(minDate.getFullYear() - 2);
    
    // X scale (time)
    const xScale = d3.scaleTime()
      .domain([minDate, d3.max(allDates)])
      .range([0, innerWidth]);

    // Y scale (sales)
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(salesData, d => d.value) * 1.1])
      .range([innerHeight, 0]);

    // Line generator for sales
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add sales area
    g.append('path')
      .datum(salesData)
      .attr('fill', 'rgba(46, 204, 113, 0.2)')
      .attr('d', d3.area()
        .x(d => xScale(d.date))
        .y0(innerHeight)
        .y1(d => yScale(d.value))
        .curve(d3.curveMonotoneX));

    // Add sales line
    g.append('path')
      .datum(salesData)
      .attr('fill', 'none')
      .attr('stroke', '#27ae60')
      .attr('stroke-width', 3)
      .attr('d', line);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y')))
      .selectAll('text')
      .style('font-size', '12px');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px');

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Year');

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('E-commerce Sales ($ millions)');

    // Company founding events
    g.selectAll('.founding-line')
      .data(foundingData)
      .enter()
      .append('line')
      .attr('class', 'founding-line')
      .attr('x1', d => xScale(d.foundedDate))
      .attr('x2', d => xScale(d.foundedDate))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#8e44ad')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    // Company labels - improved spacing to prevent overlap
    g.selectAll('.company-label')
      .data(foundingData)
      .enter()
      .append('text')
      .attr('class', 'company-label')
      .attr('x', d => xScale(d.foundedDate))
      .attr('y', (d, i) => -45 - (i % 3) * 20) // More vertical spacing between staggered labels
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#8e44ad')
      .text(d => `${d.company} (${d.foundedDate.getFullYear()})`);

    // Add phases of e-commerce development
    const phases = [
      { startYear: 1994, endYear: 2000, name: "Early Pioneers" },
      { startYear: 2000, endYear: 2007, name: "Growth Phase" },
      { startYear: 2007, endYear: 2015, name: "Mobile Revolution" },
      { startYear: 2015, endYear: 2025, name: "Ubiquitous Commerce" }
    ];

    // Phase annotations - improved spacing
    g.selectAll('.phase')
      .data(phases)
      .enter()
      .append('rect')
      .attr('class', 'phase')
      .attr('x', d => xScale(new Date(d.startYear, 0, 1)))
      .attr('y', innerHeight + 55) // Increased spacing from x-axis
      .attr('width', d => xScale(new Date(d.endYear, 0, 1)) - xScale(new Date(d.startYear, 0, 1)))
      .attr('height', 24) // Slightly taller for better text fit
      .attr('fill', (d, i) => d3.schemeCategory10[i % 10])
      .attr('opacity', 0.7);

    g.selectAll('.phase-label')
      .data(phases)
      .enter()
      .append('text')
      .attr('class', 'phase-label')
      .attr('x', d => xScale(new Date(d.startYear, 0, 1)) + 
        (xScale(new Date(d.endYear, 0, 1)) - xScale(new Date(d.startYear, 0, 1)))/2)
      .attr('y', innerHeight + 71) // Centered in the phase rect
      .attr('text-anchor', 'middle')
      .style('dominant-baseline', 'middle') // Better vertical alignment
      .style('font-size', '11px') // Slightly larger font
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .text(d => d.name);

    // Add consumption impact annotation - better positioned
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 25) // Move up to prevent overlap with bottom of SVG
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-style', 'italic')
      .text('Note: Each new platform introduced novel ways to simplify purchasing, accelerating consumption patterns');

  }, [isDataLoaded, foundingData, salesData]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '850px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        The E-commerce Effect: How Online Shopping Drives Overconsumption
      </h1>

      <section style={{ marginBottom: '50px' }}>
        <div ref={growthChartRef}></div>
        <p style={{ marginTop: '20px', fontSize: '16px' }}>
          This visualization demonstrates the parallel rise of e-commerce sales and consumer loans in the United States. 
          As online shopping platforms became more prevalent, consumer borrowing increased dramatically, suggesting 
          that e-commerce may enable and encourage spending beyond consumers' immediate financial means.
        </p>
      </section>

      <section style={{ marginBottom: '50px' }}>
        <div ref={percentChartRef}></div>
        <p style={{ marginTop: '20px', fontSize: '16px' }}>
          The growing share of retail happening online shows how consumer habits have fundamentally shifted. 
          E-commerce's convenience, 24/7 availability, and frictionless payment systems have made impulse purchases
          easier than ever before, potentially contributing to overconsumption.
        </p>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <div ref={timelineChartRef}></div>
        <p style={{ marginTop: '20px', fontSize: '16px' }}>
          This timeline shows how the founding of major e-commerce platforms coincided with significant sales growth.
          Each company introduced innovations that reduced friction in the purchasing process: one-click ordering,
          free shipping, mobile shopping apps, and subscription services that all make consumption easier and more frequent.
        </p>
      </section>

      <footer style={{ marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '20px', fontSize: '14px' }}>
        <p><strong>Data Sources:</strong> Retail sales and e-commerce percentage data from US Census Bureau, 
        consumer loans data from Federal Reserve, company founding dates from public records.</p>
      </footer>
    </div>
  );
}

export default EcommerceOverconsumption;