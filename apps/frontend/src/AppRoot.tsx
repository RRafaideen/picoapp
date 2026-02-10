import { useEffect as effect, useState as signal } from 'react'
import { Routes, Route, NavLink } from 'react-router'

const delay = (sec: number) => new Promise((res) => setTimeout(res, sec * 1000));

const registry = new Map<string, (args: { props?: object }) => JSX.Element>();
registry.set('home', ({name = 'dude'}) => <h1>Hello {name} !</h1>);
registry.set('next', () => <h1>This is my next page</h1>);
registry.set('html', ({html = ''}) => <div dangerouslySetInnerHTML={{__html: html}} />);

type DynRoute = { name: string; path: string;  component: string; }
type AppState = { stage: 'loading'|'loaded'|'error'; error: Error|null; }

function AppRoot() {
  const [state, setState] = signal<AppState>({stage: 'loaded', error: null});
  const [routes, setRoutes] = signal<DynRoute>([]);
  const [dialog, setDialog] = signal<'open'|'close'>('close');

  const eventHandler = () => {
    const websockets = new WebSocket('ws://localhost:8080/events');
    websockets.addEventListener('message', ({data}) => {
      const { event, target } = JSON.parse(data);
      setDialog(event == 'change' && target == 'routes' ? 'open' : 'close');
    });
  }

  const loadRoutes = async () => {
    setState({...state, stage: 'loading'});
    try {
      await delay(2);
      const response = await fetch("http://localhost:8080/api/route.list");
      if(response.status > 299) throw new Error("Cannot load dyn routes");
      setRoutes(await response.json());
      setState({stage: 'loaded', error: null});
    } catch(error) {
      setRoutes([]);
      setState({stage: 'error', error});
    }
  }

  effect(() => void loadRoutes(), []);
  effect(() => void eventHandler(), []);

  return <>
    <nav>
      {routes.map(({name, path}, i) =>
        <NavLink key={i} to={path}>
          <button>{name}</button>
        </NavLink>
      )}
    </nav>
    <main>
      {state.stage == 'error' && <h2>Something when wrong !</h2>}
      {state.stage == 'loading' && <h2>App loading...</h2>}
      {state.stage == 'loaded' && <Routes>
        {routes.map(({name, path, component, props = {}}, i) => {
          let Component: any = <h2>Component "{component}" not registered</h2>;
          if(registry.has(component)) {
            Component = registry.get(component)!
            Component = <Component  {...props} />
          }
          return <Route key={i} path={path} element={Component} />
        })}
        <Route path="/*" element={<h1>Page not found</h1>} />
      </Routes>}
    </main>
    <dialog open={dialog != 'close'}>
      <h2>A new version is here !</h2>
      <h3>Do you want to get it ?</h3>
      <div>
        <button onPointerDown={() => setDialog('close') || loadRoutes()}>Yes</button>
        <button onPointerDown={() => setDialog('close')}>No</button>
      </div>
    </dialog>
  </>
}

export default AppRoot
