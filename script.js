"use strict";

const RAW_FILE_URL = 'https://raw.githubusercontent.com/revoufajar/nyc-dataset/main/nyc_data.json';
const dataTransaction = {
    raw: [],
    filtered: []
};

let dataFilter = {
    years: [],
    boroughs: [],
    buildingClasses: [],
    residentialTypes: []
};
let stats = {
    totalSalesPrice: 0,
    totalUnits: 0,
    totalBuildings: 0,
    totalLandSquareUnits: 0
};

const BOROUGH_COLOUR_TEMPLATE = {
    'Queens': '#5F0F40',
    'Staten Island': '#9A031E',
    'Brooklyn': '#FB8B24',
    'Bronx': '#E36414',
    'Manhattan': '#0F4C5C',
};
const NUMBRO_CONFIG = {
    average: true,
    mantissa: 2,
    optionalMantissa: true,
};
const charts = {
    chartSalesTrendByBorough: null,
    chartSalesTrend: null,
    chartUnitTrendByResidentialType: null,
    chartLandSquareByBorough: null,
    chartTotalUnitByBorough: null,
};
let tableData = {
    rawData: [],
    viewData: [],
    page: 0,
    itemsPerPage: 20,
    totalData: 0
};
/*WAIT UNTIL DOM LOADED*/
document.addEventListener("DOMContentLoaded", function () {
    HTMLCollection.prototype.forEach = Array.prototype.forEach;
    NodeList.prototype.forEach = Array.prototype.forEach;

    Chart.register(ChartDataLabels);
    init();
});

function fetchData(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
        .then((response) => response.json())
        .then((json) => {
            resolve(json);
        })
    });
}

async function init() {
    showSpinner();

    /*INIT RAW & FILTER DATA*/
    dataTransaction.raw = await fetchData(RAW_FILE_URL);

    dataTransaction.filtered = dataTransaction.raw;

    dataFilter = {
        dates: alasql('SELECT mon_yyyy, yyyy_mm, count(*) as cnt FROM ? GROUP BY mon_yyyy, yyyy_mm ORDER BY yyyy_mm DESC', [dataTransaction.raw]),
        boroughs: alasql('SELECT borough_name, count(*) as cnt FROM ? GROUP BY borough_name ORDER BY borough_name ASC', [dataTransaction.raw]),
        buildingClasses: alasql('SELECT building_classification, count(*) as cnt FROM ? GROUP BY building_classification ORDER BY building_classification ASC', [dataTransaction.raw]),
        residentialTypes: alasql('SELECT residential_type, count(*) as cnt FROM ? GROUP BY residential_type ORDER BY residential_type ASC', [dataTransaction.raw])
    };
    initDropdowns();
    
    /*PERFORM FILTER*/
    visualize();

    hideSpinner();
}

function initDropdowns() {
    const checkListDate = document.getElementById('list-date');
    checkListDate.getElementsByClassName('anchor')[0].onclick = function(evt) {
      if (checkListDate.classList.contains('visible'))
        checkListDate.classList.remove('visible');
      else
        checkListDate.classList.add('visible');
    }

    const listDateItems = document.getElementById('list-date-items');
    dataFilter.dates.forEach(date => {
        listDateItems.innerHTML += '<li><input type="checkbox" checked/>&nbsp; ' + date.mon_yyyy + '</li>';
    });

    const checkListBorough = document.getElementById('list-borough');
    checkListBorough.getElementsByClassName('anchor')[0].onclick = function(evt) {
      if (checkListBorough.classList.contains('visible'))
        checkListBorough.classList.remove('visible');
      else
        checkListBorough.classList.add('visible');
    }

    const listBoroughItems = document.getElementById('list-borough-items');
    dataFilter.boroughs.forEach(borough => {
        listBoroughItems.innerHTML += '<li><input type="checkbox" checked/>&nbsp; ' + borough.borough_name + '</li>';
    });
}

function beginFilter() {
    console.log('beginFilter');
    const filterQuery = generateFilterQuery();
    dataTransaction.filtered = alasql(('SELECT * FROM ? ' + filterQuery), [dataTransaction.raw]);
    dataLocationTransaction.filtered = alasql(('SELECT * FROM ? ' + filterQuery), [dataLocationTransaction.raw]);
    visualize();
}

function generateFilterQuery() {
    const boroughFilters = getListFilter('list-borough-items');
    const dateFilters = getListFilter('list-date-items');
    const filters = [];

    if (dateFilters.length > 0) {
        const clause = 'mon_yyyy IN (' + (dateFilters.map(value => '\'' + value.toString() + '\'').join(',')) + ')';
        filters.push(clause);
    }
    if (boroughFilters.length > 0) {
        const clause = 'borough_name IN (' + (boroughFilters.map(value => '\'' + value.toString() + '\'').join(',')) + ')';
        filters.push(clause);
    }
    return (filters.length > 0 ? 'WHERE ' : '') + filters.join(' AND ');
}

function getListFilter(id) {
    const listItems = document.getElementById(id).getElementsByTagName('li');
    const checked = [];
    listItems.forEach((item, i) => {
        const name = item.innerText.trim();
        const isChecked = item.children[0].checked;
        if (isChecked) {
            checked.push(name);
        }
    });
    return checked;
}

function visualize() {
    visualizeChart(dataTransaction.filtered);
}

function visualizeChart(data) {
    navigateStats(data);
    navigateChartLandSquareByBorough(data);
    navigateChartTotalUnitByBorough(data);
    navigateChartSalesTrend(data);
    navigateChartSalesTrendByBorough(data);
    navigateTableDataSalesTrendByBorough(data);
    navigateUnitTrendByResidentialType(data);
    navigateTableData(data);
}

function navigateStats(data) {
    stats = alasql('SELECT SUM(sale_price) as totalSalesPrice, SUM(total_unit) as totalUnits, SUM(lot) as totalBuildings, SUM(land_square_feet) as totalLandSquareUnits FROM ?', [data])[0];
    document.getElementById('totalSalesPrice').innerHTML = '$' + numbro(stats.totalSalesPrice).format(NUMBRO_CONFIG);
    document.getElementById('totalUnits').innerHTML = numbro(stats.totalUnits).format(NUMBRO_CONFIG);
    document.getElementById('totalBuildings').innerHTML = numbro(stats.totalBuildings).format(NUMBRO_CONFIG);
    document.getElementById('totalLandSquareUnits').innerHTML = numbro(stats.totalLandSquareUnits).format(NUMBRO_CONFIG);
}

function navigateChartLandSquareByBorough(data) {
    if (charts.chartLandSquareByBorough !== null) {
        charts.chartLandSquareByBorough.destroy();
    }
    const chartData = alasql('SELECT borough_name as x, SUM(land_square_feet) as y FROM ? GROUP BY borough_name ORDER BY SUM(land_square_feet) DESC', [data]);
    const ctx = document.getElementById('chartLandSquareByBorough');
    const labels = chartData.map(cd => {
        return cd.x;
    });
    const colors = labels.map(label => {
        return BOROUGH_COLOUR_TEMPLATE[label];
    });
    const options = {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Series',
                data: chartData.map(cd => {
                    return cd.y;
                }),
                backgroundColor: colors
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: true,
                    align: 'center'
                },
                datalabels: {
                    color: 'white',
                    formatter: function (value, ctx) {
                        const total = ctx.dataset.data.reduce((acc, value) => {
                            return acc + value;
                        });
                        const percentage = ((value / total) * 100).toFixed(2) + '%';
                        return percentage; 
                    }
                }
            }
        }
    };
    charts.chartLandSquareByBorough = new Chart(ctx, options);
}

function navigateChartTotalUnitByBorough(data) {
    if (charts.chartTotalUnitByBorough !== null) {
        charts.chartTotalUnitByBorough.destroy();
    }
    const chartData = alasql('SELECT borough_name as x, SUM(total_unit) as y FROM ? GROUP BY borough_name ORDER BY SUM(total_unit) DESC', [data]);
    const ctx = document.getElementById('chartTotalUnitByBorough');
    const labels = chartData.map(cd => {
        return cd.x;
    });
    const colors = labels.map(label => {
        return BOROUGH_COLOUR_TEMPLATE[label];
    });
    const options = {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Series',
                data: chartData.map(cd => {
                    return cd.y;
                }),
                backgroundColor: colors
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: true,
                    align: 'center'
                },
                datalabels: {
                    color: 'white',
                    formatter: function (value, ctx) {
                        const total = ctx.dataset.data.reduce((acc, value) => {
                            return acc + value;
                        });
                        const percentage = ((value / total) * 100).toFixed(2) + '%';
                        return percentage; 
                    }
                }
            }
        }
    };
    charts.chartTotalUnitByBorough = new Chart(ctx, options);
}

function navigateChartSalesTrend(data) {
    if (charts.chartSalesTrend !== null) {
        charts.chartSalesTrend.destroy();
    }
    const chartData = alasql('SELECT yyyy_mm, mon_yyyy, SUM(sale_price) as y FROM ? GROUP BY yyyy_mm, mon_yyyy ORDER BY yyyy_mm ASC', [data]);
    const _data = chartData.map(cd => {
        return {
            x: cd.mon_yyyy,
            y: cd.y
        };
    });
    const ctx = document.getElementById('chartSalesTrend');
    const options = {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Sales',
                data: _data,
                backgroundColor: '#0F4C5C'
            }]
        },
        options: {
            plugins: {
                datalabels: {
                    color: 'white',
                    formatter: function (value, ctx) {
                        return numbro(value.y).format(NUMBRO_CONFIG);
                    }
                }
            }
        }
    };
    charts.chartSalesTrend = new Chart(ctx, options);
}

function navigateChartSalesTrendByBorough(data) {
    if (charts.chartSalesTrendByBorough !== null) {
        charts.chartSalesTrendByBorough.destroy();
    }
    const dates = alasql('SELECT yyyy_mm, mon_yyyy FROM ? GROUP BY yyyy_mm, mon_yyyy ORDER BY yyyy_mm ASC', [data]);
    const _labels = dates.map(date => {
        return date.mon_yyyy;
    });
    const boroughs = dataFilter.boroughs;
    const _datasets = boroughs.map(borough => {
        const boroughName = borough.borough_name;
        const _data = [];
        dates.forEach(date => {
            const sumOf = alasql('SELECT COALESCE(SUM(sale_price), 0) as [value] FROM ? WHERE borough_name = ? AND mon_yyyy = ?', [data, boroughName, date.mon_yyyy]);
            _data.push(sumOf.length > 0 ? sumOf[0].value : 0);
        });
        return {
            label: boroughName,
            data: _data,
            borderColor: BOROUGH_COLOUR_TEMPLATE[boroughName]
        };
    });

    const ctx = document.getElementById('chartSalesTrendByBorough');
    const options = {
        type: 'line',
        data: {
            labels: _labels,
            datasets: _datasets
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            stacked: false,
            plugins: {
                datalabels: {
                    display: false
                }
            }
        }
    };
    charts.chartSalesTrendByBorough = new Chart(ctx, options);
}

function navigateTableDataSalesTrendByBorough(data) {
    const salesByBoroughName = alasql('SELECT borough_name as boroughName, SUM(sale_price) as totalSale FROM ? GROUP BY borough_name ORDER BY 2 DESC', [data]);        
    const tableBody = document.getElementById('table-of-sales-trend-by-borough');
    /*clear content*/
    tableBody.innerHTML = '';

    salesByBoroughName.forEach((data, i) => {
        const totalSale = '$' + numbro(data.totalSale).format(NUMBRO_CONFIG);
        tableBody.innerHTML += `<tr><th class="text-center align-middle">${i + 1}</th><td class="text-center align-middle">${data.boroughName}</td><td class="text-end align-middle">${totalSale}</td></tr>`;
    });
}   

function navigateUnitTrendByResidentialType(data) {
    if (charts.chartUnitTrendByResidentialType !== null) {
        charts.chartUnitTrendByResidentialType.destroy();
    }
    const dates = alasql('SELECT yyyy_mm, mon_yyyy FROM ? GROUP BY yyyy_mm, mon_yyyy ORDER BY yyyy_mm ASC', [data]);
    const _labels = dates.map(date => {
        return date.mon_yyyy;
    });
    const residentialTypes = dataFilter.residentialTypes;
    const _datasets = residentialTypes.map(residentialType => {
        const residentialTypeName = residentialType.residential_type;
        const _data = [];
        dates.forEach(date => {
            const sumOf = alasql('SELECT COALESCE(SUM(total_unit), 0) as [value] FROM ? WHERE residential_type = ? AND mon_yyyy = ?', [data, residentialTypeName, date.mon_yyyy]);
            _data.push(sumOf.length > 0 ? sumOf[0].value : 0);
        });
        return {
            label: residentialTypeName,
            data: _data,
            backgroundColor: (residentialTypeName === 'RESIDENTIAL') ? '#0A7029' : '#2E8BC0'
        };
    });

    const ctx = document.getElementById('chartUnitTrendByResidentialType');
    const options = {
        type: 'bar',
        data: {
            labels: _labels,
            datasets: _datasets
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            stacked: false,
            plugins: {
                datalabels: {
                    color: 'white',
                    formatter: function (value, ctx) {
                        return numbro(value).format({ average: true, mantissa: 0 });
                    }
                }
            }
        }
    };
    charts.chartUnitTrendByResidentialType = new Chart(ctx, options);
}

function navigateTableData(data) {
    tableData = {
        rawData: data,
        viewData: [],
        page: 0,
        itemsPerPage: 20,
        totalData: data.length
    };
    viewTableData();
}

function viewTableData() {
    const tbody = document.getElementById('data-table');
    tbody.innerHTML = '';
    const totalData = numbro(tableData.totalData).format({ mantissa: 0 });

    const pageStart = (tableData.page * tableData.itemsPerPage);
    const pageEnd = ((tableData.page + 1) * tableData.itemsPerPage);
    tableData.viewData = tableData.rawData.slice(pageStart, pageEnd);

    tableData.viewData.forEach((data, idx) => {
        const numberRecord = (idx + (tableData.page * tableData.itemsPerPage)) + 1;
        const salePrice = '$' + numbro(data.sale_price).format(NUMBRO_CONFIG);
        const unit = numbro(data.total_unit).format({ average: true, mantissa: 0 });
        const lot = numbro(data.lot).format({ average: true, mantissa: 0 });
        const landSquareFeet = numbro(data.land_square_feet).format({ average: true, mantissa: 0 });

        tbody.innerHTML += 
        `<tr>
            <th class="text-center">${numberRecord}</th>
            <td>${data.mon_yyyy}</td>
            <td>${data.borough_name}</td>
            <td>${data.building_classification}</td>
            <td>${data.residential_type}</td>
            <td class="text-end">${unit}</td>
            <td class="text-end">${salePrice}</td>
            <td class="text-end">${lot}</td>
            <td class="text-end">${landSquareFeet}</td>
        </tr>`;
    });

    const tableDataStatus = document.getElementById('table-data-status');
    tableDataStatus.innerHTML = `Showing ${pageStart + 1} to ${pageEnd} of ${totalData} entries `;
    checkTableButton();
}

function tablePrevPage() {
    if (tableData.page === 0) {
        return;
    }
    tableData.page = tableData.page - 1;
    viewTableData();
}

function tableNextPage() {
    const totalPage = Math.ceil(tableData.totalData / tableData.itemsPerPage);
    if (tableData.page === (totalPage - 1)) {
        return;
    }
    tableData.page = tableData.page + 1;
    viewTableData();
}

function checkTableButton() {
    const btnPrev = document.getElementById('table-data-btn-prev');
    if (tableData.page === 0) {
        btnPrev.disabled = true;
    } else {
        btnPrev.disabled = false;
    }
    const btnNext = document.getElementById('table-data-btn-next');
    const totalPage = Math.ceil(tableData.totalData / tableData.itemsPerPage);
    if (tableData.page === (totalPage - 1)) {
        btnNext.disabled = true;
    } else {
        btnNext.disabled = false;
    }
}

function showSpinner() {
    document.getElementById('loading').style.visibility = 'visible';
}

function hideSpinner() {
    document.getElementById('loading').style.visibility = 'hidden';
}