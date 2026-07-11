import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);

      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(
        `Erro ao carregar a chave "${key}" do localStorage:`,
        error,
      );

      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(
        `Erro ao salvar a chave "${key}" no localStorage:`,
        error,
      );
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}