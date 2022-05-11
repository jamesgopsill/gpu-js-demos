// GPU.js imported in the top-level html file
// This tells the scripts that it exists and we can use it here.
const GPU = window.GPU

const gpu = new GPU()
document.getElementById("mode").innerHTML = gpu.mode

// Creating the gameArray [y][x]
const gameWidthAndHeight = 20
let gameArray = []
for (let y = 0; y < gameWidthAndHeight; y++) {
	gameArray.push([])
	for (let x = 0; x < gameWidthAndHeight; x++) {
		gameArray[y].push(0)
	}
}

// Initial conditions
gameArray[10][5] = 1
gameArray[11][5] = 1
gameArray[12][5] = 1
gameArray[12][4] = 1
gameArray[10][3] = 1

const gameOfLifeKernel = gpu.createKernel(function(arr, width, height) {

	const x0 = this.thread.x - 1
	const x1 = this.thread.x
	const x2 = this.thread.x + 1
	if (x0 < 0) x0 = width - 1
	if (x2 > width - 1) x2 = 0

	const y0 = this.thread.y - 1
	const y1 = this.thread.y
	const y2 = this.thread.y + 1
	if (y0 < 0) y0 = height - 1
	if (y2 > height - 1) y2 = 0

	let count = 0
	if (arr[y0][x0] == 1) count++
	if (arr[y0][x1] == 1) count++
	if (arr[y0][x2] == 1) count++
	if (arr[y1][x2] == 1) count++
	if (arr[y2][x2] == 1) count++
	if (arr[y2][x1] == 1) count++
	if (arr[y2][x0] == 1) count++
	if (arr[y1][x0] == 1) count++

	const cell = arr[this.thread.y][this.thread.x]
	// Rule One
	if (cell == 1 && count < 2) return 0
	// Rule Two
	if (cell == 1 && count == 2) return 1
	if (cell == 1 && count == 3) return 1
	// Rule Three
	if (cell == 1 && count > 3) return 0
	// Rule Four
	if (cell == 0 && count == 3) return 1
	
	return cell
})
.setPipeline(true)
.setImmutable(true)
.setOutput([gameWidthAndHeight, gameWidthAndHeight])

// GPU Canvas
const renderKernel = gpu.createKernel(function(arr) {
	this.color(
		1-arr[this.thread.x][this.thread.y], 
		1-arr[this.thread.x][this.thread.y], 
		1-arr[this.thread.x][this.thread.y], 
		1
	)
})
.setOutput([gameWidthAndHeight, gameWidthAndHeight])
.setGraphical(true)
const canvas = renderKernel.canvas
canvas.classList.add("my-canvas")
renderKernel(gameArray)
document.getElementById("raw").appendChild(canvas)


// Access the canvas on the webpage (so we can manipulate the scale)
const plot = document.getElementById("scaled")
const plotWidthAndHeight = gameWidthAndHeight * 8
plot.width = plotWidthAndHeight
plot.height = plotWidthAndHeight
const plotCtx = plot.getContext("2d")
plotCtx.imageSmoothingEnabled = false
// Draw the GPU canvas onto the webpage canvas
plotCtx.drawImage(canvas, 0, 0, plotWidthAndHeight, plotWidthAndHeight)

// Iteration one
let i = 1
document.getElementById("iteration").innerHTML = i
let t0 = performance.now()
let res = gameOfLifeKernel(gameArray, gameWidthAndHeight, gameWidthAndHeight)
let resArray = res.toArray()
renderKernel(resArray)
plotCtx.drawImage(canvas, 0, 0, plotWidthAndHeight, plotWidthAndHeight)

const render = () => {
	document.getElementById("fps").innerHTML = 1000 / (performance.now() - t0)
	t0 = performance.now()
	i++
	document.getElementById("iteration").innerHTML = i

	res = gameOfLifeKernel(res, gameWidthAndHeight, gameWidthAndHeight)
	resArray = res.toArray()
	renderKernel(resArray)
	plotCtx.drawImage(canvas, 0, 0, plotWidthAndHeight, plotWidthAndHeight)
	
	// Exit after 1000 iterations.
	if (i < 1000) window.requestAnimationFrame(render)
}

// Start rendering
window.requestAnimationFrame(render)