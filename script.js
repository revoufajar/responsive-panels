"use strict"

document.addEventListener("DOMContentLoaded", () => {
  drawLineChart();
  drawBarChart();
});

function drawLineChart() {
	const options = {
        type: 'line',
        data: {
		  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
		  datasets: [
		    {
		      label: 'Dataset 1',
		      data: [290, 283, 222, 372, 362]
		    },
		    {
		      label: 'Dataset 2',
		      data: [190, 392, 389, 217, 281]
		    }
		  ]
		},
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            }
        }
    };
    const ctx = document.getElementById('lineChart');
    new Chart(ctx, options)
}

function drawBarChart() {
	const options = {
        type: 'bar',
        data: {
		  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
		  datasets: [
		    {
		      label: 'Dataset 1',
		      data: [290, 283, 222, 372, 362]
		    },
		    {
		      label: 'Dataset 2',
		      data: [190, 392, 389, 217, 281]
		    }
		  ]
		},
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            }
        }
    };
    const ctx = document.getElementById('barChart');
    new Chart(ctx, options)
}