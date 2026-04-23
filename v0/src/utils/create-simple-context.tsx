import { createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

import type { ContextProviderComponent, ParentProps } from "solid-js";

export function createSimpleContext<T extends object>({
  name,
  init,
}: {
  name: string;
  init: T;
}) {
  const ctx = createContext();

  return {
    provider(props: ParentProps) {
      const store = createStore(init);
      return (
        <ctx.Provider value={store}>{props.children}</ctx.Provider>
      ) as ContextProviderComponent<unknown>;
    },
    use() {
      const value = useContext(ctx);
      if (!value)
        throw new Error(
          `${name} Context must be used within a context provider`,
        );
      return value as ReturnType<typeof createStore<T>>;
    },
  };
}
