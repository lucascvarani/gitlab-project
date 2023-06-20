import axios from 'axios';

type Pipeline = {
    id: string;
}

type Commit = {
    id: string;
}

type Job = {
    id: string;
    name: string;
    status: string;
    commit: Commit;
}

const getPipelines = async (projectId: string, page: number): Promise<Pipeline[] | undefined> => {
    try {
        // 👇️ const data: GetUsersResponse
        const { data, status } = await axios.get<Pipeline[]>(
          `https://gitlab.com/api/v4/projects/${projectId}/pipelines`,
          {
            headers: {
              Accept: 'application/json',
            },
            params: {
                per_page: 50,
                page
            }
          },
        );
        return data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.log('error message: ', error.message);
        } else {
          console.log('unexpected error: ', error);
        }
      }
}

const getJobsByPipelineId = async (projectId:string, pipelineId: string): Promise<Job[] | undefined> => {
    try {
        const { data, status } = await axios.get<Job[]>(
          `https://gitlab.com/api/v4/projects/${projectId}/pipelines/${pipelineId}/jobs`,
          {
            headers: {
              Accept: 'application/json',
            },
            params: {
                include_retried: true,
                per_page: 50
            }
          },
        );
        // const data = [
        //     {
        //         id: '1',
        //         name: 'Testes8',
        //         status: 'Passed',
        //         commit: { id: '1' }
        //     },
        //     {
        //         id: '2',
        //         name: 'Testes7',
        //         status: 'Failed',
        //         commit: { id: '1' }
        //     },
        //     {
        //         id: '3',
        //         name: 'Testes23',
        //         status: 'skipped',
        //         commit: { id: '1' }
        //     },
        //     {
        //         id: '4',
        //         name: 'Testes3',
        //         status: 'Failed',
        //         commit: { id: '1' }
        //     },
        //     {
        //         id: '5',
        //         name: 'Testes2',
        //         status: 'Failed',
        //         commit: { id: '1' }
        //     }
        // ]
        return data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.log('error message: ', error.message);
        } else {
          console.log('unexpected error: ', error);
        }
      }
}

const main = async (): Promise<void> => {
    const projectId = '3163647';
    let page = 1;
    while (page < 10) {
        const pipelines = await getPipelines(projectId, page);
        if (pipelines) {
            pipelines.forEach(async (pipeline: Pipeline) => {
                console.log(console.log(`>>>> PipelineId ${pipeline.id} <<<<`))
                const jobs = await getJobsByPipelineId(projectId, pipeline.id)
                const jobsRetrieds: Job[][] = [];
                const result = jobs?.reduce(function(r, a) {
                    r[a.name] = r[a.name] || [];
                    r[a.name].push(a);
                    return r;
                  }, Object.create(null));
                for (const key in result) {
                    const obj = result[key];
                    if (obj.length > 1) { // Checar status, precisa ser diferente.
                        const statuses: string[] = [];
                        obj.forEach((o: Job) => {
                            statuses.push(o.status);
                        })
                        if (statuses.includes('failed') && statuses.includes('success')) {
                            jobsRetrieds.push(obj)
                        }
                    }
                }
                if (jobsRetrieds.length > 0) {
                    console.log(`--------- Pipeline Id ${pipeline.id} ---------`)
                    console.log('jobsRetrieds: ')
                    console.log(jobsRetrieds)
                }
            }); 
        }
        page = page + 1; 
    }
}

main();
