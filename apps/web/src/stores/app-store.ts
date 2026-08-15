import { create } from 'zustand';
import { api, type Repository } from '../lib/api';

type AppState = {
  repositories: Repository[];
  selectedRepoId: string | null;
  loadingRepos: boolean;
  error: string | null;
  loadRepositories: () => Promise<void>;
  selectRepository: (id: string | null) => void;
  addRepository: (repository: Repository) => void;
  updateRepository: (id: string, patch: Partial<Repository>) => void;
};

export const useAppStore = create<AppState>((set) => ({
  repositories: [],
  selectedRepoId: null,
  loadingRepos: false,
  error: null,

  loadRepositories: async () => {
    set({ loadingRepos: true, error: null });
    try {
      const { repos } = await api<{ repos: Repository[] }>('/repos');
      set((state) => ({
        repositories: repos,
        selectedRepoId:
          state.selectedRepoId && repos.some((repo) => repo.id === state.selectedRepoId)
            ? state.selectedRepoId
            : (repos[0]?.id ?? null),
        loadingRepos: false,
      }));
    } catch (error) {
      set({
        loadingRepos: false,
        error: error instanceof Error ? error.message : 'Unable to load repositories',
      });
    }
  },

  selectRepository: (selectedRepoId) => set({ selectedRepoId }),
  addRepository: (repository) =>
    set((state) => ({
      repositories: [repository, ...state.repositories.filter((repo) => repo.id !== repository.id)],
      selectedRepoId: repository.id,
    })),
  updateRepository: (id, patch) =>
    set((state) => ({
      repositories: state.repositories.map((repo) => (repo.id === id ? { ...repo, ...patch } : repo)),
    })),
}));
