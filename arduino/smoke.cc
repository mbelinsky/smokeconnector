#include "WiFly.h"

char passphrase[] = "rockyairplane342";
char ssid[] = "smoke";

byte server[] = { 192, 168, 1, 23 }; // My pc

Client client(server, 3000);


char host[]="http://192.168.1.23";

//Client client("smokealarm.jit.su", 3000);

const int buttonPin = 2;
boolean lastConnected = false;                 // state of the connection last time through the main loop

String jsonData= "";
String response = "";

unsigned long eventTime=0;
const unsigned long resetTime=10*1000;
boolean isAlarm=false;
int buttonState = 0;

String alarmType = "Button Press"; //lock this in for testing


void setup() {
  Serial.begin(9600);
  Serial.println("Hello world. Will now connect to WiFi");

  WiFly.begin();
  
  if (!WiFly.join(ssid, passphrase)) {
    Serial.println("Router connection failed");
    while (1) {
      // Hang on failure.
    }
  }  
  Serial.print("WiFly connected to ");
  Serial.println(ssid);
  
}






void setAlarm(){
  isAlarm=true;
  Serial.print("Trying to connect to server for sending data at ");
    Serial.println(millis());


  if (client.connect()) {
    Serial.println("Making POST request...");
    // send the HTTP PUT request:
    jsonData = "{\"eventTime\":\"";
    jsonData += eventTime;
    jsonData +="\",\"connectionTime\":\""; //The time it takes to connect to the server from noticing the alarm
    jsonData += millis()-eventTime;
    jsonData +="\",\"alarmType\":\"";
    jsonData += alarmType;
    jsonData +="\"}";
    //Serial.println(jsonData);
    //Serial.println(jsonData.length());

    client.println("POST /alert HTTP/1.0");
    client.print("Host:");
	client.println("localhost");
    client.println("Content-Type: application/json;");
    client.print("Content-Length: ");
    client.println(jsonData.length());
    client.println("Connection: close");

    client.println();
    client.println(jsonData);
    Serial.println(jsonData);

  } 
  else {
    // if you couldn't make a connection:
    Serial.println("connection failed, disconnecting!");
    client.stop();
  }

}


void sendResetAlert(){
  	//do sending of status
	Serial.println("Resetting alarm to off");

}



void loop(){
  buttonState=digitalRead(buttonPin);
  
  while (client.available()) {
    char c = client.read();
    response+= c;
  }
  
  if (!client.connected() && lastConnected) {
    Serial.println("disconnecting.");
    Serial.println();
    client.stop();
    response="";
  }
  
  if(isAlarm==false){
    if(buttonState == HIGH){
		Serial.println("Smoke Alarm Simulated!!!");
      	eventTime=millis();
      	setAlarm();
    }    
  }
  else{ //Check if enough time has passed for alarm to be reset
    if(!client.connected() && (millis()-eventTime > resetTime)){
      isAlarm=false;
      sendResetAlert();
    }
  }
  
  
  
    lastConnected = client.connected(); //Check if still connected

  
  
  

}