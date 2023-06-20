import axios from 'axios';
import { appendFileSync } from 'fs';
import moment from 'moment';
import projectIds from './project-ids';

const filename = `./flaky_tests ${moment().format('YYYY_MM_DD hh:mm:ss a')}.csv`

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
    web_url: string;
}

const getPipelines = async (projectId: string, page: number): Promise<Pipeline[] | undefined> => {
    try {
        // 👇️ const data: GetUsersResponse
        const { data, status } = await axios.get<Pipeline[]>(
          `https://gitlab.com/api/v4/projects/${projectId}/pipelines`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
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
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
            },
            params: {
                include_retried: true,
                per_page: 50
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

function sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

const main = async (): Promise<void> => {
    const csvHeader = `ProjectId,PipelineId,Job name,Succes job url,Failed job url\n`;
    try {
        appendFileSync(filename, csvHeader);
    } catch (err) {
        console.error(err);
    }
    projectIds.forEach(async (projectId: string) => {
        let page = 1;
        while (page < 3) {
            const pipelines = await getPipelines(projectId, page);
            if (pipelines) {
                pipelines.forEach(async (pipeline: Pipeline) => {
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
                        jobsRetrieds.forEach((retriedJobList: Job[]) => {
                            const successRetriedJobListPos = retriedJobList.map(e => e.status).indexOf('success');
                            const filedRetriedJobListPos = retriedJobList.map(e => e.status).indexOf('failed');
                            const csv = `${projectId},${pipeline.id},${retriedJobList[0].name},${retriedJobList[successRetriedJobListPos].web_url},${retriedJobList[filedRetriedJobListPos].web_url}\n`;
                            try {
                                appendFileSync(filename, csv);
                            } catch (err) {
                                console.error(err);
                            }
                        });
                        console.log(`--------- Pipeline Id ${pipeline.id} ---------`)
                        console.log('jobsRetrieds: ')
                        console.log(jobsRetrieds)
                    }


                }); 
            }
            page = page + 1; 
        }
    })
    
}

main();
