/*
 * sri sri guru gauranga jayatah
 */

import firebase from "firebase/app";

import Vue from "vue";
import Router from "vue-router";

Vue.use(Router);

export const router = new Router({
  mode: "history",
  routes: [
    { path: "*", redirect: "/" },
    {
      path: "/login",
      meta: { guestOnly: true },
      component: () => import("@/components/Layout/MainLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/Login.vue")
        }
      ]
    },
    {
      path: "/sound-editing/",
      component: () => import("@/components/Layout/AnonymousLayout.vue"),
      children: [
        {
          path: "upload/:uploadCode",
          component: () => import("@/views/SoundEngineerUpload.vue")
        }
      ]
    },
    {
      path: "/sound-editing/:taskId/quality-check/feedback",
      component: () => import("@/views/QCSubmissionForm.vue")
    },
    {
      path: "/listen/:fileName",
      component: () => import("@/components/Layout/AnonymousLayout.vue"),
      children: [
        {
          path: "", component: () => import("@/views/Listen.vue")
        }
      ]      
    },
    {
      path: "/",
      meta: { requireAuth: true },
      component: () => import("@/views/Dashboard.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/Home.vue")
        },
        {
          path: "cr/allot",
          component: () => import("@/views/CRAllotment.vue")
        },
        {
          path: "users",
          component: () => import("@/views/Users/List.vue"),
          meta: { menuItem: true, menuName: "People", menuIcon: "fas fa-users" }
        },
        {
          path: "reporting/content/",
          component: () => import("@/views/CR/CR.vue"),
          meta: { activator: true, activatorName: "Content Reporting", menuIcon: "far fa-file-audio" },
          children: [
            { path: "",
              component: () => import("@/views/CR/List.vue"),
              meta: { menuItem: true }
            },
            { path: "allot", component: () => import("@/views/CR/Allotment.vue"), meta: { menuItem: true } },
          ]
        },
        {
          path: "sqr/",
          component: () => import("@/views/SQR/SQR.vue"),
          meta: {
            activator: true,
            activatorName: "Sound Quality Reporting",
            menuIcon: "fas fa-headphones"
          },
          children: [
            {
              path: "",
              component: () => import("@/views/SQR/Files.vue"),
              meta: { menuItem: true }
            },
            {
              path: "allot",
              component: () => import("@/views/SQR/Allotment.vue"),
              meta: { menuItem: true }
            },
            {
              path: "statistics",
              component: () => import("@/views/SQR/FileStatistics.vue"),
              meta: { menuItem: true }
            }
          ]
        },
        {
          path: "se/",
          component: () => import("@/views/SE/SE.vue"),
          meta: {
            activator: true,
            activatorName: "Sound Engineering",
            menuIcon: "fas fa-music"
          },
          children: [
            {
              path: "",
              component: () => import("@/views/SE/Tasks.vue"),
              meta: { menuItem: true }
            },
            {
              path: "allot",
              component: () => import("@/views/SE/Allotment.vue"),
              meta: { menuItem: true }
            }
          ]
        },
        {
          path: "te/allot",
          component: () => import("@/views/TEAllotment.vue")
        },
        {
          path: "te/fc/allot",
          component: () => import("@/views/TFCAllotment.vue")
        },
        {
          path: "/qc/allot",
          component: () => import("@/views/QCAllotment.vue")
        }
      ]
    }
  ]
});

router.beforeEach((to, from, next) => {
  let currentUser = firebase.auth().currentUser;
  let requireAuth = to.matched.some(record => record.meta.requireAuth);
  let guestOnly = to.matched.some(record => record.meta.guestOnly);

  if (requireAuth && !currentUser)
    next({
      path: "/login",
      query: { redirect: to.fullPath }
    });
  else if (guestOnly && currentUser) next("/");
  else next();
});