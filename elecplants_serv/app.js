/**
* Software: ElecPlants
* @autor: Francisco de Assis de Souza Rodrigues
* @site: http://rodriguesfas.com.br
* @licesa: MIT
* @data: 22/09/2016
* @vesion: 0.0.5
*/

// Express é um framework que permite cria app web com facilidade com node.js.
var app = require("express")();
var express = require("express");

// Na pasta public é onde colocaremos o arquivo Chart.js
app.use(express.static(__dirname + '/public'));

var http = require("http").Server(app);

//var http = require('http').createServer(servidor);
var fs = require('fs');
var io = require('socket.io').listen(http);
var five = require('johnny-five');

// child process
var exec = require('child_process').exec

var Fn = five.Fn; //Define uma lib do johnny-five

var arduino = new five.Board();

var hygrometer = 0;
var ldr_res = 0;

/**
* arduino.on -
*/
arduino.on('ready', function(){
  console.log("Arduino Pronto!");

  /**
  * Define o sensor de lus LDR...
  * scale([0, 100]) - Usa-se para definir que a leitura acontese de 0 à 100 [valorInicial, valorFinal]
  */
  var sensor_LDR = new five.Sensor("A0");
  var sensorHIGROMETRO = new five.Sensor("A1");
  var sensorNivel = new five.Sensor("A2");
  var LED = new five.Led(13);

/**
 * Options:
 * bitMode: 4 or 8, defaults to 4
 * lines: number of lines, defaults to 2
 * dots: matrix dimensions, defaults to "5x8"
 */
 var lcd = new five.LCD({
    // LCD pin name  RS  EN  DB4 DB5 DB6 DB7
    // Arduino pin # 7    8   9   10  11  12
    pins: [7, 8, 9, 10, 11, 12],
    backlight: 6,
    rows: 2,
    cols: 20
  });

  // Tell the LCD you will use these characters:
  lcd.useChar("check");
  lcd.useChar("heart");
  lcd.useChar("duck");

  // Line 1: Hi rmurphey & hgstrp!
  lcd.clear().print("Eu :heart: ElecPlants!");
  lcd.cursor(1, 0);

  /* Line 2: I <3 johnny-five */
  // lcd.print("I").write(7).print(" johnny-five");

  /* can now be written as: */
  // lcd.print("Eu :heart: ElecPlants!");

  this.wait(3000, function() {
    //lcd.clear().cursor(0, 0).print("I :check::heart: 2 :duck: :)");
    lcdShow(lcd);
  });

  this.repl.inject({
    lcd: lcd
  });

  /**
   * Control the relay in real time
   * from the REPL by typing commands, eg.
   * relay.on();
   * relay.off();
   */
   var relay = new five.Relay(5);
   this.repl.inject({
    relay: relay
  });


  /**
  * sensor_LDR.on - Envia os valores lidos pelo sensor, para o socket.io exibir na pagina html..
  * io.emit - envia dados.
  * Math.round() retorna o numero inteiro mais proximo
  */
  sensor_LDR.on('change', function(){
    var valor = Fn.map(Math.round(this.value), 1023, 0, 0, 100);
    //console.log(valor);
    io.emit('sensor_LDR', valor);
    ldr_res = valor;
    // lcdShow(lcd);
  });

  /**
   * sensorHIGROMETRO
   * Math.round() retorna o numero inteiro mais proximo
   */
   sensorHIGROMETRO.on('change', function(){
    // mapea valores lidos dos sensror.
    hygrometer = Fn.map(Math.round(this.value), 1023, 0, 0, 100);

    // lcdShow(lcd);

    //controla erro dos valores.
    if(hygrometer > 100) hygrometer = 100;
    if((hygrometer <= 0) || (hygrometer <= 10)) hygrometer = 0;

    //acionamento do motor
    if(hygrometer >= 60){ //se o solo estiver com umidade >= a 70% desliga motor.
      relay.off();
      io.emit('status_Motor', "OFF"); //envia 0 para a pag. web
    }else if(hygrometer < 40){//se o solo estiver com umidade < 30% liga o motor.
      relay.on();
      io.emit('status_Motor', "ON"); //envia 1 para a pag. web
    }

    //console.log(hygrometer);
    io.emit('sensorHIGROMETRO', hygrometer); //envia dados para a pagina web.
  });

  /**
   * sensorNivel
   * verifica o nível de agua no reservatório da bomba de d'água.
   */
   sensorNivel.on('change', function(){
    var nivel = Fn.map(Math.round(this.value), 1023, 0, 0, 100);
    //controla erro dos valores.
    if(nivel > 100) nivel = 100;
    if((nivel <= 0) || (nivel <= 10)) nivel = 0;
    io.emit('sensorNivel', nivel);
    //console.log(this.value);
  });


 });


/**
* app.get - local da pagina web.
*/
app.get("/", function(req, res){
  res.sendfile("view/index.html");
});


/**
* http.listen - cria servidor para acessar apagina da aplicação.
*/
http.listen(4000, function(){
  console.log("Servidor On-line em http://localhost:4000"); //URL link.
  console.log("Para sair Ctrl+C"); //comando para Off-line servidor.
  exec('start http://localhost:4000');//start servidor.
});

function lcdShow(lcd){
  setInterval(function(){
      lcd.clear().cursor(0, 0).print("Umidade: " + hygrometer);
      lcd.cursor(1, 0).print("Luz: " + ldr_res);  
  },1000)
  
}