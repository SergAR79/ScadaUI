const charts = {};

const connectionSensor = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7177/sensor")
    .configureLogging(signalR.LogLevel.Information)
    .build();

    const connectionTank = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7177/tank")
    .configureLogging(signalR.LogLevel.Information)
    .build();

async function start() {
    try {
        await connectionSensor.start();
        console.log("SignalR Connected.");
    } catch (err) {
        console.log(err);
        setTimeout(start, 5000);
    }
};


connectionSensor.on("ReceiveSensorModel", (id, engaged) =>
  {
    console.log(`received values: ${engaged} for ID: ${id}`);
    const element = document.getElementById(id);
    if(element){
      element.textContent = engaged;
      setSensorValue(id,engaged);
    }
    else
    {
      console.warn(`Element with ID: ${id} not found.`)
    }
  });

connectionSensor.onclose(async () => {
    await start();
});

// Start the connection.
start();


document.getElementById('create-sensor-form').onsubmit = onFormSubmit;
document.getElementById('update-sensor-form').onsubmit = onFormUpdate;

getSensors();

function getSensors(){
    axios.get('https://localhost:7177/api/sensor')
    .then(result =>{
        console.log(result);

        result.data.forEach(sensor => {
            createSensor(sensor.id,
                sensor.name,
                sensor.description,
                sensor.engaged,
                sensor.onlevel,
                sensor.offlevel,
                sensor.x,
                sensor.y,
                sensor.unit)
        });
    });
}

function createSensor(id, name, description, engaged, onlevel, offlevel, x, y, unit)
{
    const body = document.getElementsByTagName('body')[0];
    const child = document.createElement('div');

    child.className='sensor';
    child.style.left = `${x}px`
    child.style.top = `${y}px`;

    const engagedElement = document.createElement('p');
    engagedElement.id = id;
    engagedElement.textContent = engaged;
    engagedElement.className='sensor-engaged';

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    buttonContainer.style.display = 'none';

    const diagramButton = document.createElement('button');
    diagramButton.className = 'diagram-button';
    diagramButton.textContent = 'Diagram';

    diagramButton.setAttribute('chart-id', 'chart-' + id);
    diagramButton.onclick = onShowDiagramClick;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'diagram-button';
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = (e) => onDelete(e, id);

    buttonContainer.appendChild(diagramButton);
    buttonContainer.appendChild(deleteButton);

    child.appendChild(engagedElement);
    child.appendChild(buttonContainer);

    engagedElement.onclick = () => {
        buttonContainer.style.display = buttonContainer.style.display === 'none'? 'block' : 'none';
    }

    // const chart = createChart(id, name, child, values);
    //charts[id] = chart;

    body.appendChild(child);
}

document.getElementById('backgroundArea').onclick = (e) =>
{
    document.getElementById('x').value = e.x;
    document.getElementById('y').value = e.y;
}

function onFormSubmit(e)
{
    console.log("onFormSubmit");
    e.preventDefault();

    if(e.submitter.value === 'Create')
    {
        console.log("e.submitter.value");
        tryNewSensor(e.target[0].value,
            e.target[1].value,
            e.target[2].value,
            e.target[3].value,
            e.target[4].value,
            e.target[5].value,
            e.target[6].value,)
    }
}

function tryNewSensor(name, description, engaged, onlevel, offlevel, x, y, unit)
{
    console.log("tryNewSensor");
    axios.post('https://localhost:7177/api/sensor', {
        name: name, description: description, engaged: engaged,
            onlevel: onlevel, offlevel: offlevel, x: x, y:y , unit: unit
    })
    .then(result =>{
        createSensor(result.data, name, description, engaged, onlevel, offlevel, x, y, unit)
    });
}

function setSensorValue(id, engaged)
{
  const element = document.getElementById(id);
  element.textContent =engaged;

  if(charts[id]){
    const chart = charts[id];

    const numericValue = parseFloat(value.replace(',', '.'));

    if(isNaN(numericValue)){
        console.error("Numeric Value is not valid: ", numericValue);
        return;
    }

    chart.data.datasets[0].data.push(numericValue);
    chart.data.labels.push(chart.data.labels.length);
    
    chart.update();
  }
  else{
    console.warn(`Chart for ID ${id} not found`);
  }
}

function onFormUpdate(e)
{
  e.preventDefault();
  if(e.submitter.value === 'Update')
  {
    const param1 = e.target[0].value;
    const param2 = e.target[1].value;

    updateTargetValue(param1, param2);
  }
}

function changeBackgroundImage(id)
{
    const element = document.getElementsByClassName('background-image')[0];
    element.src = 'https://localhost:7177/api/BackgroundImage/' + id;
    console.log(element)
}

document.getElementById("changeBg").addEventListener("submit", function(event){
    event.preventDefault();
    const value = document.getElementById('changeBgNumber').value;
    changeBackgroundImage(value);
});

document.getElementById("imageForm").addEventListener("submit", function(event){
    event.preventDefault();

    var formData = new FormData();
    var fileInput = document.getElementById("imageInput").files[0];

    if(fileInput)
    {
        formData.append("image", fileInput);
        axios.post('https://localhost:7177/api/backgroundimage/upload-image', formData)
        .then(result =>{
            console.log("Image uploaded successfully")
        })
        .catch(error => {
            console.error("Error : ", error);
        });
    }
    else
    {
        console.error("No file selected");
    }
});




function onShowDiagramClick(e){
    const chartId = e.target.getAttribute('chart-id');
    const diagramElement = document.getElementById(chartId);

    if(diagramElement){
        console.log ("Diagram element found", diagramElement);

        const style = diagramElement.style;
        style.display = style.display === 'none' || style.display === ''? 'block' : 'none';
        console.log ("Diagram visibility toggled");
    }
    else
    {
        console.log ("Diagram element not found");
    }
}

function onDelete(e, id){
    axios.delete(`https://localhost:7177/api/sensor/${id}`);
    e.target.parentElement.remove();
}

function createChart(id, chartName, parentElement, values){
    console.log("Creating chart...");

    const ctx = document.createElement('canvas');
    ctx.id = 'chart-' + id;
    ctx.className = 'diagram';
    ctx.style.display = 'none';

    if(!values || values.length === 0){
        console.error("No values provided for chart.");
        return;
    }

    parentElement.appendChild(ctx);

    const numericValues = values.map(value => parseFloat(value.replace(',', '.')));

    if(numericValues.some(isNaN)){
        console.error("One or more values are not valid numbers: ", numericValues);
        return;
    }

    const data = {
        labels: numericValues.map((_, i) => i),
        datasets:[{
            label: chartName,
            data: numericValues,
            borderColor: 'rgb(250,20,20)',
            fill: false,
            tension: 0.4
        }]
    };

    const plugin = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
            const { ctx } = chart;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = options.color || '#99ffff';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    };

    const options = {
        animation: true,
        responsive: true,
        plugins: {
            customCanvasBackgroundColor: { color: 'lightGreen' }
        },
        scales: {
            y: {
                min: 0,
                max: 100
            }
        }
    };

    const chart = new Chart(ctx, {type: 'line', data, options, plugins:[plugin]});
    charts[id] = chart;

    console.log("Chart created:", ctx.id);
    return chart;
}