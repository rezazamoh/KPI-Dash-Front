import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchDevelopers = async () => {
    const response = await axios.get(`${BASE_URL}/developers`);
    return response.data;
};

export const fetchProjects = async () => {
    const response = await axios.get(`${BASE_URL}/projects`);
    return response.data;
};