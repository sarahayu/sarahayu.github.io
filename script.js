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

// modified from https://stackoverflow.com/a/21015393
function getStarTextOffsetCentered(text, idx, sizePX) {
    const font = `bold ${ sizePX }px Tangerine`
    // re-use canvas object for better performance
    const canvas = getStarTextOffsetCentered.canvas || (getStarTextOffsetCentered.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    const metrics = -context.measureText(text).width / 2 + context.measureText(text.slice(0, idx)).width + context.measureText(text[idx]).width / 2;
    return metrics;
}

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

        for (let i = 0; constData.lines && i < constData.lines.length; i += 4) {
            constBB
                .append('path')
                .attr('class', 'const-line ignore-pointer')
                .attr('d', d3.line()
                    .x(d => x(d[0]))
                    .y(d => y(d[1]))([constData.lines.slice(i, i + 2), constData.lines.slice(i + 2, i + 4),]))
        }

        constData.fullconst && constBB
            .append('text')
            .text(constData.fullconst)
            .attr('class', constData.const + '-label const-label ignore-pointer')
            .style('transform', `translate(${x(constData.label_center[0])}px,${y(constData.label_center[1])}px) rotate(${constData.label_rot}deg)`)

        constOthers
            .selectAll('constStars')
            .data(constData.stars || [])
            .join('circle')
            .attr('class', constData.const + '-star const-star ignore-pointer')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', d => r(d.mag))
            .attr('opacity', d => op(d.mag))

        constOthers
            .append('g')
            .selectAll('constLets')
            .data(constData.letters || [])
            .join('text')
            .attr('class', constData.const + '-let const-let ignore-pointer ' + (ext ? 'ext-link' : ''))
            .attr('x', d => x(d.pos[0]) + 20 * Math.sin(degToRad * d.offset))
            .attr('y', d => y(d.pos[1]) - 20 * Math.cos(degToRad * d.offset) + 3)
            .attr('fill', '#ffffff')
            .attr('font-size', 0.023 * height)
            .text(d => d.let)

        sub && constOthers
            .append('text')
            .attr('x', x(constData.center[0]))
            .attr('y', y(constData.center[1]))
            .attr('class', constData.const + '-sub const-sub ignore-pointer')
            .style('opacity', 0)
            .text(sub)

        if (!(constData.const in actionLinks)) {
            constBB.classed('ignore-pointer', true)
            return
        }

        constBB
            .attr('tabindex', 0)
            .attr('class', 'const-group-bb')
            .on('mouseenter focus', () => {
                constElem
                    .selectAll(`.${constData.const}-let`)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr('x', (_, i) => { return x(constData.center[0]) + getStarTextOffsetCentered(constData.letters.map(d => d.let).join(''), i, 0.069 * height) })
                    .attr('y', (_, i) => y(constData.center[1]))
                    .attr('fill', '#ffa500')
                    .attr('font-size', 0.069 * height)

                constElem
                    .selectAll(`.${constData.const}-label`)
                    .style('visibility', 'hidden')

                constElem
                    .selectAll(`.${constData.const}-star`)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr('cx', d => x(d.newX))
                    .attr('cy', d => y(d.newY))
                    .attr('opacity', 0.17)

                constElem
                    .selectAll(`.${constData.const}-sub`)
                    .transition()
                    .duration(250)
                    .style('opacity', 0.5)
                    .style('transform', function () { return `translate(0, ${this.getBoundingClientRect().height * 1.3}px)` })
                    .attr('fill', '#ffa500')
            })
            .on('mouseleave blur', () => {
                constElem
                    .selectAll(`.${constData.const}-let`)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr('x', d => x(d.pos[0]) + 20 * Math.sin(degToRad * d.offset))
                    .attr('y', d => y(d.pos[1]) - 20 * Math.cos(degToRad * d.offset) + 3)
                    .attr('fill', '#ffffff')
                    .attr('font-size', 0.023 * height)

                constElem
                    .selectAll(`.${constData.const}-label`)
                    .style('visibility', 'visible')

                constElem
                    .selectAll(`.${constData.const}-star`)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr('cx', d => x(d.x))
                    .attr('cy', d => y(d.y))
                    .attr('opacity', d => op(d.mag))

                constElem
                    .selectAll(`.${constData.const}-sub`)
                    .transition()
                    .duration(0)
                    .style('opacity', 0)
                    .style('transform', 'translate(0, 0)')
            })
            .on('click keypress', e => {
                if (e.type == 'click' || (e.type == 'keypress' && e.key == 'Enter')) {
                    window.open(lnk, ext ? '_blank' : '_self')
                }
            })
    })

const met = svg.append('g')
const trail = svg.append('g')

while (true) {
    const xx = d3.randomUniform(width - 200)(), yy = d3.randomUniform(height - 200)()
    const tr = trail.selectAll('ellipse')
        .data([{ x: xx, y: yy }])
        .join('ellipse')
        .attr('rx', 0)
        .attr('ry', 0)
        .style('transform', d => `translate(${d.x}px, ${d.y}px) rotate(45deg)`)
        .attr('fill', 'white')
        .attr('opacity', 0.5)
    
    const del = d3.randomUniform(2000)() + 1000
    tr
        .transition("pos")
        .delay(del)
        .duration(500)
        .ease(d3.easeLinear)
        .style('transform', d => `translate(${d.x + 100}px, ${d.y + 100}px) rotate(45deg)`)
        .attr('rx', 100)
        // .end()

    // const tr2 = met.selectAll('ellipse')
    //     .data([{ x: xx, y: yy }])
    //     .join('ellipse')
    //     .attr('rx', 5)
    //     .attr('ry', 1)
    //     .style('transform', d => `translate(${d.x}px, ${d.y}px) rotate(45deg)`)
    //     .attr('fill', 'white')
    //     .attr('opacity', 0)
    // // const del2 = d3.randomUniform(1000)() 
    // tr2
    //     .transition("op")
    //     .delay(del)
    //     .duration(3000)
    //     .ease(d3.easeLinear)
    //     .attr('opacity', 1)
    //     .transition("op")
    //     .duration(2000)
    //     .ease(d3.easeLinear)
    //     .attr('opacity', 0)
    // tr2
    //     .transition("rad")
    //     .delay(del)
    //     .duration(3000)
    //     .ease(d3.easeLinear)
    //     // .ease(d3.easeBackOut.overshoot(10))
    //     .attr('rx', 10)
    //     .attr('ry', 5)
    //     .transition("rad")
    //     .duration(2000)
    //     .ease(d3.easeLinear)
    //     // .attr('rx', 6)
    //     .attr('ry', 0)

    // tr2
    //     .transition("pos")
    //     .delay(del)
    //     .duration(5000)
    //     .ease(d3.easeLinear)
    //     .style('transform', d => `translate(${d.x + 170}px, ${d.y + 170}px) rotate(45deg)`)

    await tr
        .transition("op")
        .delay(del)
        .duration(300)
        .ease(d3.easeLinear)
        .attr('ry', 2)
        // .attr('opacity', 0.5)
        .transition("op")
        // .delay(300)
        .duration(250)
        .ease(d3.easeLinear)
        .attr('ry', 0)
        .end()
}