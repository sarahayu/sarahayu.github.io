import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'
import { STAR_DATA } from './assets/data.js'

const degToRad = 3.1415 / 180

const margin = { top: 20, right: 20, bottom: 20, left: 20 },
    width = Math.min(window.innerWidth, window.innerHeight * 3.5 / 2),
    height = window.innerHeight;

const svg = d3.select('#sky')
    .attr('width', width)
    .attr('height', height)

// debugging
svg.on('click', (ev) => {
    console.log(`${x.invert(ev.offsetX)},${y.invert(ev.offsetY)}`)
})

const x = d3.scaleLinear()
    .domain([d3.min(STAR_DATA, d => d3.min(d.stars, dd => dd.x)), d3.max(STAR_DATA, d => d3.max(d.stars, dd => dd.x))])
    .range([margin.left, width - margin.right]);

const y = d3.scaleLinear()
    .domain([d3.min(STAR_DATA, d => d3.min(d.stars, dd => dd.y)), d3.max(STAR_DATA, d => d3.max(d.stars, dd => dd.y))])
    .range([height - margin.top, margin.bottom]);

const r = d3.scaleLinear()
    .domain([1, d3.max(STAR_DATA, d => d3.max(d.stars, dd => dd.mag))])
    .range([6, 1])
    .clamp(true);

const op = r.copy().range([1, 0.3])

let north = [-0.0010782980749916567, 0.09320250541074836]

let grid = svg
    .append('g')
    .attr('class', 'star-grid')
    .style('transform', `translate(${x(north[0])}px,${y(north[1])}px) rotate(15deg)`)

grid
    .selectAll('rads')
    .data(d3.ticks(0, 1440, 5).slice(1))
    .enter()
    .append('circle')
    .attr('r', r => r)

grid
    .selectAll('as')
    .data(d3.range(0, 360, 30))
    .enter()
    .append('line')
    .attr('transform', function (d) { return `rotate(${-d})` })
    .attr('x2', 1024)

const actionLinks = {
    /* link, isExternal, subtext */
    'Cyg': ['./about.html', false],
    'Lyr': ['//give.ucdavis.edu/VCSA/125342', true, 'KARIM'],
    'Dra': ['./gallery.html', false, 'my projects'],
    'UMi': ['//github.com/sarahayu', true],
    'UMa': ['//www.linkedin.com/in/sarah-yuniar', true],
}

svg.append('g')
    .selectAll('constGroups')
    .data(STAR_DATA)
    .join('g')
    .each(function (constData) {

        const [lnk, ext, sub] = actionLinks[constData.const] || []
        const constElem = d3.select(this)

        const constBB = constElem.append('g')
        const constOthers = constElem.append('g')

        constBB.append('g')
        for (let i = 0; constData.lines && i < constData.lines.length; i += 4) {
            constBB
                .append('path')
                .attr('class', 'const-line ignore-pointer')
                .attr('d', d3.line()
                    .x(d => x(d[0]))
                    .y(d => y(d[1]))([constData.lines.slice(i, i + 2), constData.lines.slice(i + 2, i + 4),]))
        }

        constData.fullconst && constBB
            .append('g')
            .append('text')
            .text(constData.fullconst)
            .attr('class', constData.const + '-label const-label ignore-pointer')
            .style('transform', `translate(${x(constData.label_center[0])}px,${y(constData.label_center[1])}px) rotate(${constData.label_rot}deg)`)

        constOthers
            .append('g')
            .selectAll('constStars')
            .data(constData.stars || [])
            .join('circle')
            .attr('class', constData.const + '-star const-star ignore-pointer')
            .attr('cx', function (d) { return x(d.x); })
            .attr('cy', function (d) { return y(d.y); })
            .attr('r', function (d) { return r(d.mag); })
            .attr('opacity', function (d) { return op(d.mag); })

        constOthers
            .append('g')
            .selectAll('constLets')
            .data(constData.letters || [])
            .join('text')
            .attr('class', constData.const + '-let const-let ignore-pointer')
            .attr('x', function (d) { return x(d.pos[0]) + 20 * Math.sin(degToRad * d.offset); })
            .attr('y', function (d) { return y(d.pos[1]) - 20 * Math.cos(degToRad * d.offset) + 3; })
            .text(function (d) { return d.let; })

        sub && constOthers
            .append('g')
            .style('transform', `translate(${x(constData.center[0])}px,${y(constData.center[1])}px)`)
            .append('text')
            .text(sub)
            .attr('class', constData.const + '-sub const-sub ignore-pointer')
            .style('opacity', 0)

        if (!(constData.const in actionLinks)) {
            constBB.classed('ignore-pointer', true)
            return
        }

        constBB
            .attr('tabindex', 0)
            .attr('class', 'const-group-bb')
            .on('mouseenter focus', (_, d) => {
                constElem
                    .selectAll(`.${d.const}-let`)
                    .classed('hovered', true)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr('x', function (dd, i) { return x(d.center[0]) + (i - d.letters.length / 2) * 25; })
                    .attr('y', function (dd, i) { return y(d.center[1]); })
                    .attr('fill', '#ffa500')

                constElem
                    .selectAll(`.${d.const}-label`)
                    .style('visibility', 'hidden')

                constElem
                    .selectAll(`.${d.const}-star`)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr('cx', function (d) { return x(d.newX); })
                    .attr('cy', function (d) { return y(d.newY); })
                    .attr('opacity', 0.17)

                constElem
                    .selectAll(`.${d.const}-sub`)
                    .transition()
                    .duration(250)
                    .style('opacity', 0.5)
                    .style('transform', function () { return `translate(0, ${this.getBoundingClientRect().height * 1.3}px)` })
                    .attr('fill', '#ffa500')
            })
            .on('mouseleave blur', (_, d) => {
                constElem
                    .selectAll(`.${d.const}-let`)
                    .classed('hovered', false)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr('x', function (d) { return x(d.pos[0]) + 20 * Math.sin(degToRad * d.offset); })
                    .attr('y', function (d) { return y(d.pos[1]) - 20 * Math.cos(degToRad * d.offset) + 3; })
                    .attr('fill', '#ffffff')

                constElem
                    .selectAll(`.${d.const}-label`)
                    .style('visibility', 'visible')

                constElem
                    .selectAll(`.${d.const}-star`)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr('cx', function (d) { return x(d.x); })
                    .attr('cy', function (d) { return y(d.y); })
                    .attr('opacity', function (d) { return op(d.mag); })

                constElem
                    .selectAll(`.${d.const}-sub`)
                    .transition()
                    .duration(0)
                    .style('opacity', 0)
                    .style('transform', 'translate(0, 0)')
                    // .attr('fill', '#ffffff')
            })
            .on('click keypress', (e) => {
                if (e.type == 'click' || (e.type == 'keypress' && e.key == 'Enter')) {
                    window.open(lnk, ext ? '_blank' : '_self')
                }
            })
    })