/* eslint-disable @typescript-eslint/no-explicit-any */
import {configureStore, createSlice, type PayloadAction} from "@reduxjs/toolkit";
import {useDispatch, useSelector} from "react-redux";
import type {NavigationRoute, NavigationRoutes} from "./Services";

/* ------------- Redux Store --------------- */
export type LoadingStateValue = "loading" | "loaded" | "error";
type LoadingState = {value: LoadingStateValue; error: any};
const LoadingInitialState: LoadingState = {value: "loading", error: null};
const LoadingSlice = createSlice({
  name: "app-loading",
  initialState: LoadingInitialState,
  reducers: {
    set: (state, action: PayloadAction<{state: LoadingStateValue; error: any}>) => {
      state.value = action.payload.state;
      state.error = action.payload.error;
    },
  },
});

type ModalState = {name: string | null; props: object | null};
const ModalIntialState: ModalState = {name: null, props: null};
const ModalSlice = createSlice({
  name: "app-modal",
  initialState: ModalIntialState,
  reducers: {
    show: (state, action: PayloadAction<ModalState>) => {
      state.name = action.payload.name;
      state.props = action.payload.props;
    },
    close: (state) => {
      state.name = null;
    },
  },
});

type RoutingState = {current: NavigationRoute | null; routes: NavigationRoutes};
const RoutingInitialState: RoutingState = {current: null, routes: []};
const RoutingSlice = createSlice({
  name: "app-router",
  initialState: RoutingInitialState,
  reducers: {
    reset: () => ({...RoutingInitialState}),
    activated: (state, action: PayloadAction<NavigationRoute>) => {
      state.current = action.payload;
    },
    routes: (state, action: PayloadAction<{key: string; routes: NavigationRoutes}>) => {
      state.routes = action.payload.routes;
    },
  },
});

type ProfileState = {key: string};
const ProfileInitialState: ProfileState = {key: "default"};
const ProfileSlice = createSlice({
  name: "app-profile",
  initialState: ProfileInitialState,
  reducers: {
    set: (state, action: PayloadAction<string>) => {
      state.key = action.payload;
    },
  },
});

export async function runtasks(...tasks: Array<() => Promise<void>>) {
  AppStore.dispatch(Actions.loader.set({state: "loading", error: null}));
  try {
    await tasks.reduce((_, task) => task(), Promise.resolve());
    AppStore.dispatch(Actions.loader.set({state: "loaded", error: null}));
  } catch (err: any) {
    const error = err?.message || "Unexpected error";
    AppStore.dispatch(Actions.loader.set({state: "error", error}));
  }
}

export const AppStore = configureStore({reducer: {loader: LoadingSlice.reducer, routing: RoutingSlice.reducer, modal: ModalSlice.reducer, profile: ProfileSlice.reducer}});
export const Actions = {loader: LoadingSlice.actions, modal: ModalSlice.actions, routing: RoutingSlice.actions, profile: ProfileSlice.actions};
export const appSelector = useSelector.withTypes<AppState>();
export const appDispatcher = useDispatch.withTypes<AppDispatch>();

export type AppState = ReturnType<typeof AppStore.getState>;
export type AppDispatch = typeof AppStore.dispatch;
