/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect as effect, type JSX } from 'react';
import { Routes, Route, NavLink, useNavigate, type NavigateFunction } from 'react-router';
import { ModalService, Navigation, type NavigationRoute } from './Services';
import { Actions, appDispatcher, appSelector, AppStore, runtasks } from './Store';
import { delay } from './utils';
import ComponentRegistry from './ComponentRegistry';


/* ---- App Components ---- */
type ScaffoldProps = { header?: JSX.Element|null, footer?: JSX.Element|null, children?: Array<JSX.Element>|JSX.Element };
function Scaffold({ header, footer, children }: ScaffoldProps) { 
  return <div className='scaffold'>
    {header && <div className='header'>{header}</div>}
    <main className='content'>{children}</main>
    {footer && <div className='footer'>{footer}</div>}
  </div>
}

function BreadCrumb() {
  const routes = appSelector(({routing: {routes}}) => routes);
  const active = appSelector(({routing: {current}}) => current);
  const isCompleted = (route: NavigationRoute) => active != null && routes.indexOf(active) > routes.indexOf(route)
  return <div className='bredcrumbs'>
    {routes.map((route) => {
      const { name, path } = route;
      const classNames = ['link'];
      if(active == route) classNames.push("active");
      if(isCompleted(route)) classNames.push("completed");
      return <NavLink  className={classNames.join(' ')} key={name} to={path}><span>{name}</span></NavLink>
    })}
  </div>
} 

function Modal() {
  const modal = appSelector((state) => state.modal);
  return <dialog open={modal.name != null}>
      {ComponentRegistry.resolve(modal.name!, modal.props)}
    </dialog>
}


/* ---- Boostraping ---- */ 
type WsHandler = (data: any) => Promise<void>|void
async function wsevents(...callables: Array<WsHandler>) { 
  const websocket = new WebSocket("ws://localhost:8080/events");
  await new Promise((res, rej) => {
    websocket.addEventListener("error", rej);
    websocket.addEventListener("open", res);
  });
  websocket.addEventListener('message', async(event) => {
    const data = JSON.parse(event.data);
    await callables.reduce((_, next) => Promise.resolve(next(data)), Promise.resolve());
  });
}

function loadRoutes() {
  return runtasks(
    async () => {   
      const { profile: { key }} = AppStore.getState();
      await delay(1);
      const { routes } = await Navigation.load(key);
      AppStore.dispatch(Actions.routing.routes({ key, routes }));
    }
  );
}

async function loadModal(name: string) { 
  if(name == null) return Actions.modal.close();
  const { props = {} } = await ModalService.load(name);
  AppStore.dispatch(Actions.modal.show({ name, props }));
}

type AppEventDependencies = {
  navigate: NavigateFunction
}
function handleAppEvents({navigate}: AppEventDependencies) {
  return wsevents(
    async (data: any) => {
      if(data.target != "navigation-change") return 
      await loadModal("modal:next-version");
      navigate("/");
    }
  )
}

type ModalNextVersionProps = { title: string, content: string }
function ModalNextVersion({ title, content }: ModalNextVersionProps) {
  const dispatch = appDispatcher();
  return <>
    <h2>{title}</h2>
    <h2>{content}</h2>
    <div>
      <button onPointerDown={() => dispatch(Actions.modal.close()) && void loadRoutes()}>Yes</button>
      <button onPointerDown={() => dispatch(Actions.modal.close())}>No</button>
    </div>  
  </>
}

ComponentRegistry.register("route:default:page-1", () => <h2>page 1</h2>);
ComponentRegistry.register("route:default:page-2", () => <h2>page 2</h2>);
ComponentRegistry.register("route:default:page-3", () => <h2>page 3</h2>);
ComponentRegistry.register("modal:next-version", ModalNextVersion);


function AppRoot() {
  const loader = appSelector((state) => state.loader.value);
  const routes = appSelector((state) => state.routing.routes);
  const profile = appSelector((state) => state.profile.key);
  const dispach = appDispatcher();
  const navigate = useNavigate();
  
  effect(() => void loadRoutes(), [profile])
  effect(() => void handleAppEvents({navigate}), []);

  return <>
    <div className="debug-bar">
      <div>Debug bar</div>
      <div>
        <button onPointerDown={() =>  dispach(Actions.profile.set("default"))}>Default</button>
        <button onPointerDown={() =>  dispach(Actions.profile.set("protected"))}>Protected</button>
      </div>
    </div>  
      {loader == 'loading' && <h2>App loading...</h2>}
      {loader == 'error' && <h2>Something when wrong !</h2>}
      {loader == 'loaded' && 
        <Scaffold header={<BreadCrumb />}>
          <main>
            <Routes>
              {routes.map((route) => {
                const { name, path, component } = route;
                const resolved = ComponentRegistry.resolve(component); 
                if(resolved == null) return <h2>Component "{component}" not registered</h2>;
                return <Route key={name} path={path} Component={() => {
                  effect(() => void AppStore.dispatch(Actions.routing.activated(route)), []);
                  return ComponentRegistry.resolve(component);
                }} />
              })}
              <Route path="/*" element={<h1>Page not found</h1>} />
            </Routes>
          </main>
        </Scaffold>}
        <Modal />
  </>
}

export default AppRoot
