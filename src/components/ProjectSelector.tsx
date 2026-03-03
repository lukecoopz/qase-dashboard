import type { QaseProject } from '../types';

interface ProjectSelectorProps {
  projects: QaseProject[];
  onSelect: (project: QaseProject) => void;
  onLogout: () => void;
}

export default function ProjectSelector({ projects, onSelect, onLogout }: ProjectSelectorProps) {
  return (
    <div className="project-selector">
      <div className="app-header">
        <h1>Qase Dashboard</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>

      <div className="project-selector-body">
        <h2 className="project-selector-heading">Select a Project</h2>
        <p className="project-selector-sub">{projects.length} project{projects.length !== 1 ? 's' : ''} available</p>

        <div className="project-grid">
          {projects.map((project) => (
            <button
              key={project.code}
              className="project-card"
              onClick={() => onSelect(project)}
            >
              <div className="project-card-code">{project.code}</div>
              <div className="project-card-title">{project.title}</div>
              {project.counts && (
                <div className="project-card-counts">
                  <span>{project.counts.cases} tests</span>
                  <span>{project.counts.suites} suites</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
