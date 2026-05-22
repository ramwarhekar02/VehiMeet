import { useEffect, useMemo, useRef, useState } from 'react'

export const useResource = (loader, deps = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loaderRef = useRef(loader)

  const dependencyKey = useMemo(() => JSON.stringify(deps), [deps])

  useEffect(() => {
    loaderRef.current = loader
  }, [loader])

  const reload = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await loaderRef.current()
      setData(response)
    } catch (err) {
      setError(err?.message || 'Something went wrong while loading data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [dependencyKey])

  return { data, loading, error, reload, setData }
}
