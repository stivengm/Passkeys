import React, { Component } from 'react';

import axios from 'axios';
import logo from './logo.svg';
import './App.css';



class App extends Component {
  constructor() {
    super();

    this.getDataEnollment = this.getDataEnollment.bind(this);
    this.validateBrowser = this.validateBrowser.bind(this);
  }

  async getDataEnollment() {
    const responseEnroll = await fetch('https://amm7t6htcj.execute-api.us-east-1.amazonaws.com/poc/create', {
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'origin': window.location.origin,
          'referer': window.location.origin
      },
      body: JSON.stringify({ "id": "20202", "name": "Daniel" })
    });
    return responseEnroll;
  }

  async validateBrowser() {
    var isAuthPasskey = false; // TODO: Si está en TRUE es Authentication de lo contrario es Enrollment

    var data;

    if (isAuthPasskey) {
      data = {"id":"e268a885-ba58-4efd-abdf-c1bffebbd782","publicKey":{"challenge":"AAABi5VwUbWYx08B7CxECZcGM2S1RoOW","timeout":180000,"rpId":"localhost","allowCredentials":[],"userVerification":"required","status":"ok","errorMessage":""}};
    } else {
      data = await this.getDataEnollment();
    }

    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((available) => {
              if (available) {
                  console.log("Supported WebAutn.");
                  // -> Pasar la información en la función
                  isAuthPasskey ? this.authenticationPasskey(data) : this.enrollmentPasskey(data);
              } else {
                  console.log("WebAuthn supported, Platform Authenticator *not* supported.");
              }
          })
          .catch((err) => {
              console.log("\nSomething went wrong.");
          });
    } else {
        console.log("\nNot supported.");
    }
  }

  async authenticationPasskey(data) {
    
    let id;

    console.log(data);
    let step1 = data;


    id = step1.id
    console.log(step1.publicKey.status);

    if (step1.publicKey.status != "ok") {

        console.log("Es diferente a OK");
        return;
    } 

    if (step1.publicKey.allowCredentials) {
        for (var i=0; i<step1.publicKey.allowCredentials.length;i++) {
            step1.publicKey.allowCredentials[i].id = this.base64urlToBytes(step1.publicKey.allowCredentials[i].id)
            step1.publicKey.allowCredentials[i].transports = ["internal"]
        }
    }

    step1.publicKey.challenge = this.base64urlToBytes(step1.publicKey.challenge)
    step1.publicKey.extensions = {
        txAuthSimple: "Sign in to your ACME account",
        exts: true,
        uvi: true,
        loc: true,
        uvm: true
    }

    let resultGET = null;
    await navigator.credentials.get({ publicKey: step1.publicKey }).then((res) => {
        console.log(res) 
        resultGET = res
    }).catch((err) => { 
        console.log(err) 
        // logs.value = logs.value + "\n" + err
    })
    
    if (resultGET == null) {
        // logs.value = logs.value + "\nChallenge error"
        return
    }

    console.log(resultGET);

    let bodyPasskey = {
        identificationNumber: "1006443265",
        documentType: "CC",
        command: "GET",
        username: "UserName",
        entityId: 5,
        userId: 11122,
        credential: {
            id: resultGET.id,
            rawId: this.bytesToBase64url(resultGET.rawId),
            type: resultGET.type,
            response: {
                clientDataJSON: this.bytesToBase64url(resultGET.response.clientDataJSON),
                attestationObject: "", // Tengo que mirar donde está este objeto.
                authenticatorData: this.bytesToBase64url(resultGET.response.authenticatorData),
                signature: this.bytesToBase64url(resultGET.response.signature),
            }
        }
    }

    console.log(bodyPasskey);
    console.log(JSON.stringify(bodyPasskey));
  }

  async enrollmentPasskey(data) {

    console.log(data);

    let id;

    let dataResponse = await data.json();

    id = dataResponse.id;

    let step1 = {
        publicKey: dataResponse.publicKey
    }

    step1.publicKey.challenge = this.base64urlToBytes(step1.publicKey.challenge)
    step1.publicKey.user.id = this.base64urlToBytes(step1.publicKey.user.id)
    if (step1.publicKey.excludeCredentials) {
        for (var i=0; i<step1.publicKey.excludeCredentials.length;i++) {
            step1.publicKey.excludeCredentials[i].id = this.base64urlToBytes(step1.publicKey.excludeCredentials[i].id)
        }
    }

    console.log(JSON.stringify(step1));

    let resultCreate = null;
    let j = 0;
    let reintentos = 3;

    do {
        resultCreate = await this.createInNavigator(step1)
        j++
    } while(resultCreate == null && j < reintentos)

    console.log(resultCreate);

    let bodyPasskey = {
        identificationNumber: "1006443265",
        documentType: "CC",
        command: "CREATE",
        username: "UserName",
        entityId: 5,
        userId: 11122,
        credential: {
            id: resultCreate.id,
            rawId: this.bytesToBase64url(resultCreate.rawId),
            type: resultCreate.type,
            response: {
                clientDataJSON: this.bytesToBase64url(resultCreate.response.clientDataJSON),
                attestationObject: this.bytesToBase64url(resultCreate.response.attestationObject)
            }
        }
    }

    console.log(JSON.stringify(bodyPasskey));

  }

  async createInNavigator(step1) {
      let resultCreate = null
      await navigator.credentials.create(step1).then((res) => { 
          // El usuario pone la huella o el FaceID
          resultCreate = res
      }).catch((err) => {
          throw err;
      })     
      return resultCreate           
  }

  bytesToBase64url(bytes) {
      var arrayBuf = ArrayBuffer.isView(bytes) ? bytes : new Uint8Array(bytes);
      const binString = Array.from(arrayBuf, (x) => String.fromCodePoint(x)).join("");
      return btoa(binString).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  base64urlToBytes (base64) {
      const padding = "====".substring(base64.length % 4);
      const binString = atob(base64.replaceAll("-", "+").replaceAll("_", "/") + (padding.length < 4 ? padding : ""));
      return Uint8Array.from(binString, (m) => m.codePointAt(0) ?? 0);
  }


  render () {
    return (
      <div className="App">

        <form>
          <input id='id' placeholder='Id' /> <br/>
          <input id='name' placeholder='name'/> <br/>
          <input id='keyName' placeholder='keyName'/> <br/>
          <input id='reintentos' placeholder='Reintentos' value={3}/>
          <br/>
          <input type='button' value="Aceptar" onClick={this.validateBrowser} />
        </form>



      </div>
    )

  }
  
}

export default App;
