/*
 * sri sri guru gauranga jayatah
 */

import firebase from "firebase/app";
import "firebase/auth";

import Vue from "vue";
import VueResource from "vue-resource";

import App from "./App.vue";

import { router } from "@/router";
import { store } from "@/store";

import Vuetify from "vuetify";
import "vuetify/dist/vuetify.min.css";

import VueFire from "vuefire";

import "@babel/polyfill";

Vue.use(VueResource);
Vue.use(VueFire);
Vue.use(Vuetify, {
  iconfont: "fa",
  icons: {
    plus: "fas fa-plus",
    listening: "fas fa-headphones",
    track: "fas fa-cut",
    sound: "fas fa-music",
    download: "fas fa-file-download",
    delete: "fas fa-trash",
    event: "fas fa-calendar"
  }
});

async function getFirebaseConfig(): Promise<Object> {
  return process.env.NODE_ENV === "production"
    ? /// loading config from Firebase Hosting reserved URL
      /// https://firebase.google.com/docs/hosting/reserved-urls#sdk_auto-configuration
      (await fetch("/__/firebase/init.json")).json()
    : {
        apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
        authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL,
        projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID
      };
}

getFirebaseConfig().then(config => {
  firebase.initializeApp(config);
  firebase.auth().onAuthStateChanged(user => {
    store.commit("user/setCurrentUser", user);
  });

  const unsubscribe: any = firebase.auth().onAuthStateChanged(() => {
    new Vue({
      router,
      store,
      firebase: {},
      render: h => h(App)
    }).$mount("#app");

    unsubscribe();
  });
});