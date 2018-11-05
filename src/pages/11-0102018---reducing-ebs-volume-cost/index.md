---
title: 'Reducing EBS Volume Cost Using AWS Step Functions'
date: '2018-11-01'
tags: ['AWS', 'Lambda', 'Step Functions', 'PCI Cloud']
type: 'blog'
---

At [Power Costs, Inc.](https://www.powercosts.com/), (PCI) we are about 2 years into our move of our development
environments into the cloud. We build enterprise software for power and utility companies that manages everything from
power generation and optimization, power sale to the energy market, settlement statement analysis and much more. Many of
our clients run an on premise installation with most newer clients opting for our hosted option.

To assist with troubleshooting, testing and feature development, clients send us copies of their database schemas that
we store and control access to. In the past when a developer or analyst needs to work on an issue for a
specific client, they would request an import of a new schema dump or a copy of an existing schema made on our
internal database. This process takes a week or more due to the space and speed constraints of our aging
internal infrastructure. Once the schema copy was complete, they would head over to one of many internal virtual
machines to install the correct version of our application and get in a Remote Desktop fight with a few other
developers along the way.

_All the examples from this post will be available on Github [here](https://github.com/powercosts/ebs-sf-example) and
include instructions for how to run the code._

## PCI Cloud

To ease this pressure, we designed and built a simple command line app and a Java web service called PCI Cloud that
would allow a user to create a new environment with a given clients database schema in AWS and shut them
down at 7pm. In the beginning we called the EC2 API to create two `t2.medium` EC2 instances, 1 for the application
server and 1 for the database with an EBS Snapshot attached containing the requested schema. PCI Cloud can create a
fresh new environment and turn it over to a developer in about 20 minutes. This was a vast improvement over the previous
week long wait time.

This system worked very well with a few teams using PCI Cloud. But we bought Cloud online for the rest of the
company cost became a concern, not because of compute expenses, but EBS volume storage. With database schema
sizes ranging from 30 GB to over 900 GB across several hundred databases we has to request a service limit increase to
200 TB of EBS volume space to make it through normal day to day operations. We also discovered that users have a
tendency to not terminate an environment after they have finished with it. We discovered some environments that had
been offline for almost 6 months with huge database schemas attached, each costing us several hundred dollars per month
for sitting around doing nothing.

Enter the humble [EBS Snapshot](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSSnapshots.html). As we became
more familiar with AWS services and began thinking about how to reduce our operating costs, we began to experiment with
the idea of snapshotting the database schema each time an environment was shutdown. This would mean that we would be
paying only for the storage blocks that differed from the previous snapshot, and since developers rarely change any of
the schema data, this would half the EBS costs of environments used every day and provide even more savings to
environments that were off for long periods of time.

## AWS Step Functions

When we were designing our snapshot on shutdown process we considered adding the code into our Java web service, but
abandoned that idea since it wasn't doing things in an Amazon way. As we looked around at the plethora of AWS
services, we became very interested in [AWS Step Functions](https://aws.amazon.com/step-functions/). This service allows
you to create a serverless state machine with various task, choice and wait states to control your workflow. Coca-Cola
gave [a great talk at re:Invent 2017](https://www.youtube.com/watch?v=sMaqd5J69Ns&feature=youtu.be&t=501) about how they
use Step Functions for reward programs and product nutrition syndication.

Our Step Functions allow invokes a series of [AWS Lambda](https://aws.amazon.com/lambda/) functions running NodeJS 8.10
to perform the various EC2 API actions to shut down all an environments instances, find the database schema volume,
detach it, create the snapshot, then notify the user. Rather than waiting inside each lambda for actions like snapshot
creation to finish (and give Amazon free money) we use a wait choice loop to check on the status of an action and
wait for its resolution.

![Stop Step Function](stop-step-function.png)

When starting an environment, we reverse the process.

![Start Step Function](start-step-function.png)

By using these Step Functions with PCI Cloud, we were able to reduce our operating costs by half. The CFO was quite
happy about that.

## Drawbacks

There are some drawbacks to this approach. First, there is the [known performance degradation of an uninitialized
volume](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-initialize.html). The OS has to sit and wait around for
EBS to fetch blocks from S3 before they can be used available to the OS. We have noticed that some database queries will be
slow the first time they are ran then normal speeds every time after that. Since all PCI Cloud environments are not
business critical, this is something we have been willing to accept.

Second, increased startup and shutdown time. Currently in PCI Cloud it takes about 7 minutes to thaw out and start up
the EC2 instances and about 15 minutes to reverse the process on shutdown. Shutdown takes longer because we stop all
the application servers first to give the database a chance to close connections and exit.

## Other Considerations

One thing to keep in mind when designing a Step Function is secure loop iteration. If you have an array of objects that
need an action performed on them that should only done once (like detaching an EBS volume) have one Lambda
function that performs work on one element of the array, and another that increments the index.
This allows you to retry an action if your API action if it gets throttled or leave your service in an exact
state after an error. [Here is a great example from the Step Function
docs](https://docs.aws.amazon.com/step-functions/latest/dg/tutorial-create-iterate-pattern-section.html#create-iterate-pattern-step-1)
on how to do this and you can see our Iterator lambda
[here](https://github.com/powercosts/ebs-sf-example/blob/master/src/functions/iterate.ts) and see it in action below.

`gist:chadjvw/21c61b092767562b4fcb42d7f5ee1653#step-function-iterator.yml`

Another great feature of Step Functions is the Retry block. While Amazon's SDKs automatically retries throttled
exceptions, we have noticed that during times of high traffic we need to retry the entire request. Amazon has a pattern
for [error retry and exponential backoff](https://docs.aws.amazon.com/general/latest/gr/api-retries.html), but this
block allows you to automatically retry the step with an exponential backoff algorithm if the step fails with the name
of an exception in the retry block eliminating the need implement this logic by hand in each lambda. Here is a list of
the various exception names that we have discovered through trial and error cover the various throttling exceptions in
the EC2 and EBS APIs.

`gist:chadjvw/21c61b092767562b4fcb42d7f5ee1653#step-function-retry.yml`

## Final Thoughts

More to follow.