/* eslint-disable @typescript-eslint/no-explicit-any */
import {useState} from "react";

export function delay(sec: number) {
  return new Promise((res) => setTimeout(res, sec * 1000));
}

export function async<T>(callable: () => Promise<T>, value?: T) {
  type StateType = "loading" | "loaded" | "error";
  type State = {state: StateType; error: any; value?: T};
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [getter, setter] = useState<State>({state: "loaded", error: null, value});
  // prettier-ignore
  return { 
    get value() { return getter.value },
    get error() { return getter.error },
    get state() { return getter.state },
    exec: () => 
      Promise.resolve(setter({ error: null, state: "loading", value }))
        .then(() => callable())
        .then((value) => setter({ error: null, value, state: "loaded" }))
        .catch((error) => setter({ error, value: undefined, state: "error" })),
  }
}
