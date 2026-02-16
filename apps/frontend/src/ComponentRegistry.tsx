/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX } from "react";


function ComponentRegistryCtor() { 
  type ComponentFn = (...args: Array<any>) => JSX.Element|Array<JSX.Element>
  const registry = new Map<string, ComponentFn>();

  function register(name: string, element: ComponentFn) {
    registry.set(name, element);
  }

  function resolve(name: string, props: any = {}): JSX.Element|Array<JSX.Element>|null { 
    let Component: any = registry.get(name);
    if(Component != undefined) Component = <Component {...props} /> 
    return Component;
  }
  return { register, resolve }
}

export const ComponentRegistry = ComponentRegistryCtor();
export default ComponentRegistry;

