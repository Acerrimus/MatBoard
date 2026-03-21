const BASE_URL = "http://localhost:8000"

export const getPositions = async () => {
    const res = await fetch(`${BASE_URL}/positions`)
    return res.json()
}

export const getPosition = async (slug) => {
    const res = await fetch(`${BASE_URL}/positions/${slug}`)
    return res.json()
}

export const getMovesFromPosition = async (slug) => {
    const res = await fetch(`${BASE_URL}/positions/${slug}/moves`)
    return res.json()
}

export const getMove = async (slug) => {
    const res = await fetch(`${BASE_URL}/moves/${slug}`)
    return res.json()
}