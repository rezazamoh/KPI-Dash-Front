import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { fetchDevelopers, fetchProjects } from '../services/backend';

const useApi = () => {
  const { data: developers, error: developersError, isLoading: isLoadingDevelopers } = useQuery('developers', fetchDevelopers);
  const { data: projects, error: projectsError, isLoading: isLoadingProjects } = useQuery('projects', fetchProjects);

  return {
    developers,
    developersError,
    isLoadingDevelopers,
    projects,
    projectsError,
    isLoadingProjects,
  };
};

export default useApi;