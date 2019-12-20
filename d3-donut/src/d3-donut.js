import { Init, d3Remove, sumTotal, makecomma, d3, svgCheck, log, svgNotMsg} from '@saramin/ui-d3-helper';
import CLASS from '@saramin/ui-d3-selector';

const DonutChart = function(...arg) {
	const plugin = new Init(arg);
	let _this = {},
		targetNodes = _this.targetNodes = Init.setTarget(plugin),
		dataContainer = _this.dataContainer = Init.setData(plugin),
		options = _this.options = Init.setOptions(plugin, {
			w: 300,
			h: 300,
			translateX: 100,
			translateY: 100,
			padAngle: 0.01,
			outerRadius: 100,
			innerRadius: 50,
			colorScheme: ['#3fa1ff', '#00d5ab'],
			wrapClass: `${CLASS.donutChartClass}`,
			sortData: 'asc',
			toolTip: false,
			toolTipTpl: '',
			tooltipX: 0,
			tooltipY: 0,
			labels: true,
			mode: null,
			total: 100,
			descAxisY: '0',
			currency: null,
			dataFillZero: false
		}),
		instances = _this.instances = [];

	class Donut {
		constructor(el,i) {
			this.el = el;
			this.idx = i;
			this.data = options.dataFillZero === true ? dataContainer[this.idx].filter(item => item.value > 0) : dataContainer[this.idx];
			this.twoPI = 2 * Math.PI;
			this.g = {};
			this.color = null;
			//this.color = d3.scaleOrdinal().range(options.colorScheme);
			this.pie = d3.pie()
				.value(d => d.value)
				.sort((a, b) => {
					switch (options.sortData) {
						case 'asc':
							return a.value - b.value;
							break;
						case 'des':
							return b.value - a.value;
							break;
						default:
							return (a.item < b.item ? 1 : -1)
					}
				});
			this.init();
		}
		init() {
			d3Remove(this.el);
			if(options.dataFillZero === true) {
				let colorArry = [];
				dataContainer[this.idx].filter((item,idx) => {
					if(item.value > 0) {
						colorArry.push(options.colorScheme[idx])
					}
					return colorArry;
				});
				this.color = d3.scaleOrdinal().range(colorArry);
			}else {
				this.color = d3.scaleOrdinal().range(options.colorScheme);
			}
			this.draw();
		}
		draw() {
			this.g = d3.select(this.el)
				.append('svg')
				.classed(options.wrapClass, true)
				.attr('width', options.w)
				.attr('height', options.h)
				.attr('viewBox', `0 0 ${options.w} ${options.h}`)
				.append('g')
				.attr('transform', `translate(${options.translateX}, ${options.translateY})`);

			switch (options.mode) {
				case 'gauge':
					this.drawGague();
					break;
				case 'pie':
					this.drawPie();
					break;
				case 'pie2':
					this.drawPie2();
					break;
				default:
					this.drawDefault();
					break;
			}
		}
		drawPie() {
			const arc = d3.arc()
				.padAngle(options.padAngle)
				.outerRadius(options.outerRadius)
				.innerRadius(options.innerRadius);

			const path = this.g.selectAll('path')
				.data(this.pie(this.data))
				.enter()
				.append('path')
				.attr('d', arc)
				.attr('fill', d => this.color(d.data.item));

			const infoTpl = (tpl, wrap) => {
				let htmlTpl = tpl;
				const filterStr1 = htmlTpl.match(/\{\{key\}\}/g);
				const filterStr2 = htmlTpl.match(/\{\{percent\}\}/g);
				const filterStr3 = htmlTpl.match(/\{\{value\}\}/g);
				const sumTotal2 = (d, data) => {
					const total = d3.sum(data.map(dataItem => dataItem.value));
					const percent = Math.round(1e3 * d / total / 10);
					return percent;
				};
				this.data.forEach((el, idx) => {
					htmlTpl = htmlTpl.replace(filterStr1[idx], this.data[idx].item);
					htmlTpl = htmlTpl.replace(filterStr2[idx], sumTotal2(this.data[idx].value, this.data));
					htmlTpl = htmlTpl.replace(filterStr3[idx], this.data[idx].value);
				});
				const infoList = document.createElement('div');
				infoList.classList.add('info_list');
				infoList.innerHTML = htmlTpl;
				wrap.appendChild(infoList);
			};

			const renderTxtInfo = () => {
				if(options.toolTipTpl !== null && options.toolTip) infoTpl(options.toolTipTpl, this.el);
			};
			renderTxtInfo();
		}
		drawPie2() {
			const radius = Math.min(options.w,options.h) / 2 - 57;
			const outerArc = d3.arc()
				.innerRadius(options.innerRadius * 1)
				.outerRadius(options.outerRadius * 1.5);

			const arc = d3.arc()
				.padAngle(options.padAngle)
				.innerRadius(options.innerRadius)
				.outerRadius(options.outerRadius);

			this.g.append('g').classed('line', true);

			const path = this.g.selectAll('path')
				.data(this.pie(this.data))
				.enter()
				.append('path')
				.attr('d', arc)
				.attr('fill', (d) =>{
					return this.color(d.data.item);
				});

			const allpoly = this.g.select('.line')
				.selectAll('polyline')
				.data(this.pie(this.data))
				.enter()
				.append('polyline')
				.classed('labelLine', true)
				.attr("stroke", "black")
				.style("fill", "none")
				.attr("stroke-width", 1)
				.attr('points', function(d) {
					let posA = arc.centroid(d),
						posB = outerArc.centroid(d),
						posC = outerArc.centroid(d),
						midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
					posC[0] = radius * 0.85 * (midangle < Math.PI ? 1 : -1);
					return [posA, posB, posC];
				});

			const sumTotal2 = (d, data) => {
				const total = d3.sum(data.map(dataItem => dataItem.value));
				const percent = Math.round(1e3 * d.data.value / total) / 10;
				return Math.round(percent) + '%';
			};

			const labels2 = this.g.selectAll(`${CLASS.legendItemValue}`)
				.data(this.pie(this.data))
				.enter();

			labels2.append('text')
				.classed(`${CLASS.legendItemValue}`, true)
				.attr('transform', d => {
					const pos = outerArc.centroid(d);
					let midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
					pos[0] = radius * 0.90 * (midangle < Math.PI ? 1 : -1);
					return 'translate(' + pos + ')';
				})
				.style('text-anchor', function(d) {
					let midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
					return (midangle < Math.PI ? 'start' : 'end')
				});
			this.g.selectAll('.label').append('tspan')
				.text(d => d.data.item)
				.attr('x', '0');

			this.g.selectAll('.label').append('tspan')
				.text(d => sumTotal2(d,this.data))
				.attr('x', '0')
				.attr('dy', '1.2em');
		}
		drawGague() {
			const arc = d3.arc()
				.padAngle(options.padAngle)
				.startAngle(0)
				.outerRadius(options.outerRadius)
				.innerRadius(options.innerRadius);


			const backgroundPath = this.g.append("path")
				.classed('background', true)
				.attr("d", arc.endAngle(this.twoPI));

			const foreGroundPath = this.g.append('path')
				.classed('foreground', true)
				.attr("d", arc.endAngle(this.twoPI * (this.pie(this.data)[0].value / options.total)));

			const percentValue = this.g.append('text')
				.attr('text-anchor', 'middle')
				.attr('class', 'percent')
				.attr('dy', options.descAxisY);

			percentValue.append('tspan')
				.classed('num', true)
				.text(this.pie(this.data)[0].value);

			percentValue.append('tspan')
				.classed('currency', true)
				.text(options.currency);
		}
		drawDefault() {
			const arc = d3.arc()
				.padAngle(options.padAngle)
				.outerRadius(options.outerRadius)
				.innerRadius(options.innerRadius);

			const path = this.g.selectAll('path')
				.data(this.pie(this.data))
				.enter()
				.append('path')
				.attr('d', arc)
				.attr('fill', (d,i) => this.color(i));

			if(options.toolTip && options.toolTipTpl !== '') {
				const tooltip = d3.select(this.el).append('div').classed('tooltip', true);
				const getTpl = (tpl, d, x, y) => {
					const tplObj = tpl.replace(/ /gi, '');
					const objMustache = tplObj.match(/{{(.*?)}}/g);
					const objUnique = objMustache.reduce((unique, item) => unique.includes(item) ? unique : [...unique, item],[]);
					let filterStr1 = objUnique[0];
					let htmlTpl = tpl.replace(filterStr1, d.data.item);
					tooltip.html(htmlTpl);
					tooltip.style('opacity', '1');
					this.el.querySelector('.tooltip').style.WebkitTransform = 'translate(' + (x - options.tooltipX) + 'px, ' + (y - options.tooltipY) + 'px)';
					this.el.querySelector('.tooltip').style.msTransform = 'translate(' + (x - options.tooltipX) + 'px, ' + (y - options.tooltipY) + 'px)';
					this.el.querySelector('.tooltip').style.transform =  'translate(' + (x - options.tooltipX) + 'px, ' + (y - options.tooltipY) + 'px)';
				}

				const labels = this.g.selectAll(`${CLASS.legendItemValue}`)
					.data(this.pie(this.data))
					.enter()
					.append('text')
					.classed(`${CLASS.legendItemValue}`, true)
					.attr('dy', '10')
					.attr('text-anchor', 'middle')
					.text(d => sumTotal(d,this.data))
					.attr('transform', d => `translate(${arc.centroid(d)})`)
					.on('mouseover', function(d, e) {
						let mouseAxis = {
							x: arc.centroid(d)[0],
							y: arc.centroid(d)[1],
						};
						getTpl(options.toolTipTpl, d, mouseAxis.x, mouseAxis.y);
					})
					.on('mouseout', () => {
						tooltip.style('opacity', '0');
					});
			}else {
				const labels = this.g.selectAll(`${CLASS.legendItemValue}`)
					.data(this.pie(this.data))
					.enter()
					.append('text')
					.classed(`${CLASS.legendItemValue}`, true)
					.attr('dy', '10')
					.attr('text-anchor', 'middle')
					.text(d => sumTotal(d,this.data))
					.attr('transform', d => `translate(${arc.centroid(d)})`);
			}

		}
	}
	Array.from(targetNodes).forEach(exec);

	function exec(el, i) {
		svgCheck.status === true ? new Donut(el, i) : svgNotMsg(el);
	}
	return _this;
}
export default DonutChart;
