// GPU.js imported in the top-level html file
// This tells the scripts that it exists and we can use it here.
const GPU = window.GPU

const gpu = new GPU()

console.log(`Mode: ${gpu.mode}`)

// Create the kernel to be evaluated at each frame
const kernel = gpu.createKernel(function(x) {
    this.color(x, x, 0, 1);
})
.setOutput([512, 512])
.setGraphical(true)

// Add the kernel canvas to the DOM
const canvas = kernel.canvas
document.getElementById("my-container").appendChild(canvas)

let i = 0
let t0 = performance.now()
const fadeRate = 250

// The render loop
const render = () => {
	// Print the FPS performance (60fps limited)
	document.getElementById("fps").innerHTML = 1000 / (performance.now() - t0)
	t0 = performance.now()
	// update the canvas
	if (i < fadeRate) i += 1 
	kernel(i / fadeRate)
	// request another frame
	window.requestAnimationFrame(render)
}

// Start rendering
window.requestAnimationFrame(render)