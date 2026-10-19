import { useCallback, useState } from 'react';

// Избранные матчи (по id). Хранятся только в памяти, пока открыто приложение.
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const isFavorite = useCallback(
    (id: string) => Boolean(favorites.includes(id)),
    [favorites]
  );

  const toggle = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) 
        ? prev.filter((item) => item !== id) 
        : [...prev, id]
    );
  }, []);

  return { favorites, isFavorite, toggle };
}