import { NextRequest, NextResponse } from 'next/server';
import { CaseDevClient } from '@/lib/case-dev/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    const client = new CaseDevClient(apiKey);

    // First, check for existing bankruptcy-tool database
    console.log('Checking for existing bankruptcy-tool database...');
    const existingProjects = await client.listDatabaseProjects();
    
    console.log('Existing projects:', existingProjects);

    // Find existing bankruptcy-tool database
    // API returns { projects: [...] } so we need to access the projects array
    let existingProject = null;
    const projectsList = (existingProjects as any)?.projects || existingProjects;
    if (projectsList && Array.isArray(projectsList)) {
      existingProject = projectsList.find((p: any) => 
        p.name && p.name.startsWith('bankruptcy-tool-')
      );
    }

    let projectId: string;
    let isNewDatabase = false;

    if (existingProject && existingProject.id) {
      // Use existing database
      console.log('Found existing database:', existingProject.name);
      projectId = existingProject.id;
    } else {
      // Create new database
      const timestamp = Date.now();
      const projectName = `bankruptcy-tool-${timestamp}`;

      console.log('No existing database found. Creating new database project:', projectName);

      const project = await client.createDatabaseProject({
        name: projectName,
        region: 'aws-us-east-1',
      });

      console.log('Database project created:', project);

      if (!project || !project.id) {
        return NextResponse.json(
          { error: 'Invalid project response - missing ID' },
          { status: 500 }
        );
      }

      projectId = project.id;
      isNewDatabase = true;
    }

    // Get connection string
    console.log(`Getting connection for project: ${projectId}`);
    const connection = await client.getDatabaseConnection(projectId);

    console.log('Database connection retrieved');

    if (!connection || !connection.connectionUri) {
      return NextResponse.json(
        { error: 'Invalid connection response - missing connectionUri' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      projectId: projectId,
      connectionString: connection.connectionUri,
      region: 'aws-us-east-1',
      isNewDatabase: isNewDatabase,
    });
  } catch (error: any) {
    console.error('Database provisioning error:', {
      error,
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: error.message || 'Failed to provision database',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
