
const yNodes = 40
const xNodes = 60

// Create the plate
const plate = []
const controls = []
for (let y = 0; y < yNodes; y++) {
	plate.push([])
	controls.push([])
	for (let x = 0; x < xNodes; x++) {
		plate[y].push(0)
		controls[y].push(0)
	}
}

// Heat the top left corner
for (let y = 0; y < 20; y++) {
	plate[y][0] = 100.
}

for (let x = 0; x < 20; x++) {
	plate[0][x] = 100.
}

// Set the nodes NOT to compute
for (let y = 0; y < yNodes; y++) {
	controls[y][0] = 1.
	controls[y][xNodes-1] = 1.
}
for (let x = 0; x < xNodes; x++) {
	controls[0][x] = 1.
	controls[yNodes-1][x] = 1.
}

console.log(plate)
console.log(controls)


// GPU.js imported in the top-level html file
// This tells the scripts that it exists and we can use it here.
const GPU = window.GPU
const gpu = new GPU()
document.getElementById("mode").innerHTML = gpu.mode

const heatTransferKernel = gpu.createKernel(function(domain, controls) {
	//return this.thread.x // + this.thread.y
	if (controls[this.thread.x][this.thread.y] == 1.) { // interesting indexing change here
		return domain[this.thread.y][this.thread.x]
	}
	let t = domain[this.thread.y-1][this.thread.x]
	t += domain[this.thread.y+1][this.thread.x]
	t += domain[this.thread.y][this.thread.x-1]
	t += domain[this.thread.y][this.thread.x+1]
	return t / 4.
}).setPipeline(true).setImmutable(true).setOutput([yNodes, xNodes])

// Get access to the GPU computed canvas
const renderKernel = gpu.createKernel(function(arr) {
	const ratio = 1 -(arr[this.thread.y][this.thread.x] / 100)
	this.color(ratio, ratio, ratio, 1);
})
.setOutput([yNodes, xNodes])
.setGraphical(true)
const canvas = renderKernel.canvas
canvas.classList.add("my-canvas")
document.getElementById("raw").appendChild(canvas)

let i = 0
let p0 = performance.now()
let flip = heatTransferKernel(plate, controls)
let flop = heatTransferKernel(plate, controls)
let res = flip.toArray()
renderKernel(res)
//console.log(res)

// Drawing a scaled version
const plot = document.getElementById("scaled")
const plotWidth = yNodes * 4
const plotHeight = xNodes * 4
plot.width = plotWidth
plot.height = plotHeight
const plotCtx = plot.getContext("2d")
// plotCtx.imageSmoothingEnabled = false
// Draw the GPU canvas onto the webpage canvas
plotCtx.drawImage(canvas, 0, 0, plotWidth, plotHeight)

const render = () => {
	i++
	document.getElementById("fps").innerHTML = 1000 / (performance.now() - p0)
	p0 = performance.now()
	document.getElementById("iteration").innerHTML = i

	if (i % 2 == 0) {
		flop = heatTransferKernel(flip, controls)
		res = flop.toArray()
	} else {
		flip = heatTransferKernel(flop, controls)
		res = flip.toArray()
	}
	renderKernel(res)
	plotCtx.drawImage(canvas, 0, 0, plotWidth, plotHeight)

	if (i < 60 * 100) {
		window.requestAnimationFrame(render)
	} else {
		console.log(res)
	}
}

// Start rendering
window.requestAnimationFrame(render)