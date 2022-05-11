// GPU.js imported in the top-level html file
// This tells the scripts that it exists and we can use it here.
const GPU = window.GPU

const gpu = new GPU()

// Constants
const boundaryTemperature = 1e2
const startingBodyTemperature = 1.8e1
const kappa = 1e-8
const length = 1e-2
const tol = 1e0
const dt = 1e0
const nNodes = 5e1

// Calculated params
const dx = length / (nNodes - 1)
const dx2 = dx**2

const initialBody = new Array(nNodes).fill(startingBodyTemperature)
initialBody[0] = boundaryTemperature
initialBody[initialBody.length - 1] = boundaryTemperature

const heatTransferKernal = gpu.createKernel(function(arr, arrLength, bT, kappa, dt, dx2) {
	if (this.thread.x == 0 || this.thread.x == arrLength) {
		return bT
	}
	const numerator = arr[this.thread.x-1] - 2*arr[this.thread.x] + arr[this.thread.x+1]
	const dT = kappa * dt * (numerator / dx2)
	return arr[this.thread.x] + dT
}).setPipeline(true).setImmutable(true).setOutput([nNodes])

// Get access to the GPU computed canvas
const renderKernel = gpu.createKernel(function(arr, min, inc) {
	const ratio = 1 - (arr[this.thread.x] - min) * inc
	this.color(ratio, ratio, ratio, 1);
})
.setOutput([nNodes, 20])
.setGraphical(true)
const canvas = renderKernel.canvas
canvas.classList.add("my-canvas")
document.getElementById("raw").appendChild(canvas)

// Access the canvas on the webpage (so we can manipulate the scale)
const plot = document.getElementById("scaled")
const plotWidth = 500
const plotHeight = 100
plot.width = plotWidth
plot.height = plotHeight
const plotCtx = plot.getContext("2d")
// plotCtx.imageSmoothingEnabled = false
// Draw the GPU canvas onto the webpage canvas
plotCtx.drawImage(canvas, 0, 0, 500, 100)

// Setup the iteration/render loop
let i = 0
let t0 = performance.now()
let inc = 1 / (boundaryTemperature - startingBodyTemperature)
let res = heatTransferKernal(initialBody, nNodes, boundaryTemperature, kappa, dt, dx2)
let resArray = res.toArray()
let minT = 0.
let maxT = 0.

const render = () => {
	// Print the FPS performance (60fps limited)
	document.getElementById("fps").innerHTML = 1000 / (performance.now() - t0)
	t0 = performance.now()
	i += 1
	document.getElementById("iteration").innerHTML = i

	// Perform a heat transfer calculations
	res = heatTransferKernal(res, nNodes, boundaryTemperature, kappa, dt, dx2)
	resArray = res.toArray()
	minT = Math.min(...resArray)

	// Update the viewer
	renderKernel(resArray, minT, inc)
	plotCtx.drawImage(canvas, 0, 0, 500, 100)
	if (i < 60 * 10) {
		window.requestAnimationFrame(render)
	} else {
		console.log(resArray)
	}
}

// Start rendering
window.requestAnimationFrame(render)