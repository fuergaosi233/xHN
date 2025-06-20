import { useState, useEffect, useCallback, useRef } from 'react'

interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
}

export function useInfiniteScroll(
  hasMore: boolean,
  isLoading: boolean,
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0.1, rootMargin = '100px' } = options
  const [isMounted, setIsMounted] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const observe = useCallback((node: HTMLDivElement | null) => {
    if (!isMounted) return
    
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    if (!node) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore()
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    observerRef.current.observe(node)
    loadingRef.current = node
  }, [hasMore, isLoading, onLoadMore, threshold, rootMargin, isMounted])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return { observe, loadingRef }
}