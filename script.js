import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'
import { STAR_DATA } from './assets/data.js'

let metCb

d3.select(window).on('resize.sky', () => {
    clearTimeout(metCb)
    init()
})

const init = async (id) => {

    const degToRad = 3.1415 / 180

    const actualWidth = window.innerWidth, actualHeight = window.innerHeight;

    const width = Math.min(window.innerWidth, window.innerHeight * 3.5 / 2),
        height = window.innerHeight,
        margin = { top: 20, right: (actualWidth - width) / 2, bottom: 20, left: (actualWidth - width) / 2 };

    const svg = d3.select('#sky')
        .html(null)
        .attr('width', actualWidth)
        .attr('height', actualHeight)        

    // debugging
    svg.on('click', (ev) => {
        console.log(`${x.invert(ev.offsetX)},${y.invert(ev.offsetY)}`)
    })

    const x = d3.scaleLinear()
        .domain([d3.min(STAR_DATA, d => d3.min(d.stars, dd => dd.x)), d3.max(STAR_DATA, d => d3.max(d.stars, dd => dd.x))])
        .range([margin.left, actualWidth - margin.right]);

    const y = d3.scaleLinear()
        .domain([d3.min(STAR_DATA, d => d3.min(d.stars, dd => dd.y)), d3.max(STAR_DATA, d => d3.max(d.stars, dd => dd.y))])
        .range([actualHeight - margin.top, margin.bottom]);

    const r = d3.scaleLinear()
        .domain([1, d3.max(STAR_DATA, d => d3.max(d.stars, dd => dd.mag))])
        .range([0.00814111261 * actualHeight, 0.0013568521 * actualHeight])
        .clamp(true);

    const op = r.copy().range([1, 0.3])

    let north = [-0.0010782980749916567, 0.09320250541074836]

    // modified from https://stackoverflow.com/a/21015393
    function getStarTextOffsetCentered(text, idx, sizePX) {
        const font = `bold ${sizePX}px Tangerine`
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

    svg.append('defs').append('svg').attr('viewBox', '0 0 14 12').attr('id', 'ext-link-svg')
        .append('path')
        .attr('d', 'M14 0.5625V3.56212C14 4.06512 13.369 4.31166 13.0042 3.95988L12.1363 3.12295L6.21734 8.83052C5.98952 9.0502 5.6202 9.0502 5.39238 8.83052L4.84242 8.3002C4.6146 8.08052 4.6146 7.72437 4.84242 7.50471L10.7614 1.79709L9.89365 0.960258C9.52734 0.607031 9.78678 0 10.3061 0H13.4167C13.7388 0 14 0.251836 14 0.5625ZM9.89307 6.34673L9.50418 6.72173C9.45001 6.77397 9.40704 6.83598 9.37773 6.90423C9.34842 6.97248 9.33333 7.04562 9.33333 7.11949V10.5H1.55556V3H7.97222C8.12692 2.99999 8.27529 2.94073 8.38469 2.83526L8.77358 2.46026C9.14105 2.10588 8.88079 1.5 8.36111 1.5H1.16667C0.522326 1.5 0 2.00367 0 2.625V10.875C0 11.4963 0.522326 12 1.16667 12H9.72222C10.3666 12 10.8889 11.4963 10.8889 10.875V6.74447C10.8889 6.24333 10.2605 5.99236 9.89307 6.34673Z')

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
                .attr('class', constData.const + '-let const-let ignore-pointer')
                .attr('x', d => x(d.pos[0]) + 20 * Math.sin(degToRad * d.offset))
                .attr('y', d => y(d.pos[1]) - 20 * Math.cos(degToRad * d.offset) + 3)
                .attr('fill', '#ffffff')
                .attr('font-size', 0.023 * actualHeight)
                .text(d => d.let)

            if (ext)
                constOthers
                    .append('use')
                    .attr("href", "#ext-link-svg")
                    .attr('class', constData.const + '-ext-svg')
                    .attr('x', x(constData.center[0]) + getStarTextOffsetCentered(constData.letters.map(d => d.let).join(''), constData.letters.length - 1, 0.069 * actualHeight))
                    .attr('y', y(constData.center[1]))
                    .attr('width', 0.25 * 0.069 * actualHeight)
                    .attr('height', 0.25 * 0.069 * actualHeight)
                    .style('transform', `translate(${0.5 * 0.069 * actualHeight}px, ${-0.5 * 0.069 * actualHeight}px)`)
                    .attr('fill', 'white')
                    .style('opacity', 0)

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

            constElem.append('a')
                .attr('href', lnk)
                .attr('class', 'const-group-bb')
                .attr('target', ext ? '_blank' : '_self')
                .call(lnkElem => {
                    lnkElem
                        .append('rect')
                        .attr('x', constBB.node().getBBox().x)
                        .attr('y', constBB.node().getBBox().y)
                        .attr('width', constBB.node().getBBox().width)
                        .attr('height', constBB.node().getBBox().height)
                        .attr('fill', 'transparent')
                })
                .on('mouseenter focus', () => {
                    constElem
                        .selectAll(`.${constData.const}-let`)
                        .transition()
                        .duration(250)
                        .ease(d3.easeCubicOut)
                        .attr('x', (_, i) => x(constData.center[0]) + getStarTextOffsetCentered(constData.letters.map(d => d.let).join(''), i, 0.069 * actualHeight))
                        .attr('y', (_, i) => y(constData.center[1]))
                        .attr('fill', '#ffa500')
                        .attr('font-size', 0.069 * actualHeight)

                    constElem
                        .selectAll(`.${constData.const}-ext-svg`)
                        .transition()
                        .delay(250)
                        .duration(0)
                        .ease(d3.easeCubicOut)
                        .style('opacity', 0.5)

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
                        .attr('font-size', 0.023 * actualHeight)

                    constElem
                        .selectAll(`.${constData.const}-ext-svg`)
                        .transition()
                        .duration(0)
                        .style('opacity', 0)

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
        })

    const met = svg.append('g')

    async function metSpawn() {
        const dist = 0.13568521031 * actualHeight
        const xx = d3.randomUniform(actualWidth - dist * 2)(), yy = d3.randomUniform(actualHeight - dist * 2)()
        const tr = met.selectAll('ellipse')
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
            .style('transform', d => `translate(${d.x + dist}px, ${d.y + dist}px) rotate(45deg)`)
            .attr('rx', dist)

        await tr
            .transition("op")
            .delay(del)
            .duration(300)
            .ease(d3.easeLinear)
            .attr('ry', 2)
            .transition("op")
            .duration(250)
            .ease(d3.easeLinear)
            .attr('ry', 0)
            .end()

        metCb = setTimeout(metSpawn, 0)
    }

    metCb = setTimeout(metSpawn, 0)
}

init()