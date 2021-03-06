import * as React from "react";
import { Spinner } from "@codeponder/ui";
import get from "lodash.get";

import { FindOrCreateCodeReviewPostComponent } from "../components/apollo-components";
import { AutoSelect } from "../components/AutoSelect";
import {
  GetViewerReposComponent,
  GetViewerReposEdges,
} from "../components/github-apollo-components";
import { GitHubApolloClientContext } from "../components/GithubApolloClientContext";
import { Router } from "../server/routes";
import { Layout } from "../components/Layout";
import { removeDuplicates } from "../utils/removeDuplicates";
import { withAuth } from "../components/withAuth";

interface State {
  title: string;
}

class PickRepo extends React.PureComponent<{}, State> {
  static contextType = GitHubApolloClientContext;

  state = {
    title: "",
  };

  handleChange = (e: any) => {
    const { name, value } = e.target;
    this.setState({ [name as keyof State]: value });
  };

  render() {
    const { title } = this.state;

    return (
      // @ts-ignore
      <Layout title="Create Code Review">
        <GetViewerReposComponent client={this.context}>
          {({ data, loading }) => {
            if (loading) {
              return <Spinner />;
            }

            if (!data) {
              return "no data";
            }

            return (
              <FindOrCreateCodeReviewPostComponent>
                {mutate => (
                  <>
                    <input
                      name="title"
                      value={title}
                      onChange={this.handleChange}
                    />
                    <AutoSelect
                      items={data.viewer.repositories.edges}
                      itemToString={(item: GetViewerReposEdges) =>
                        item.node!.name
                      }
                      onChange={async (item: GetViewerReposEdges) => {
                        const programmingLanguages = get(
                          item,
                          "node.languages.edges",
                          []
                        ).map((x: any) => x.node!.name);
                        const topics = get(
                          item,
                          "node.repositoryTopics.edges",
                          []
                        ).map((x: any) => x.node!.topic.name);
                        const response = await mutate({
                          variables: {
                            codeReviewPost: {
                              title,
                              topics: removeDuplicates([
                                ...programmingLanguages,
                                ...topics,
                              ]),
                              commitId: item.node!.defaultBranchRef!.target.oid,
                              description: item.node!.description || "",
                              repo: item.node!.name,
                              repoOwner: item.node!.owner.login,
                            },
                          },
                        });

                        console.log(response);
                        if (response && response.data) {
                          Router.pushRoute("post", {
                            id:
                              response.data.findOrCreateCodeReviewPost
                                .codeReviewPost.id,
                          });
                        }
                      }}
                    />
                  </>
                )}
              </FindOrCreateCodeReviewPostComponent>
            );
          }}
        </GetViewerReposComponent>
      </Layout>
    );
  }
}

export default withAuth(PickRepo);
