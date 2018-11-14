---
title: 'Reducing AWS Costs With Step Functions'
date: '2018-11-14'
tags: ['AWS', 'Lambda', 'Step Functions', 'EBS', 'EC2']
type: 'blog'
---

Cutting AWS on-demand spending by half may seem like crazy talk but at [Power Costs, Inc.](https://www.powercosts.com/)
(PCI) we achieved this by automating the shutdown and snapshotting of our instances. It's been about 2 years since we
moved the majority of our internal development servers to AWS EC2. This has given us new levels of capability and
flexibility and the monetary costs that comes with it.

In the below photo you can see our journey through EBS snapshots. Before we took any cost cutting measures, EBS
comprised about 70% of our daily AWS EC2 spending. When we introduced our first snapshot routine EBS costs fell to about
55% for volumes and 2% for snapshots. These savings came from snapshotting the volume that held the actual database
information. Our second snapshot routine snapshots all volumes attached to an instance. This led to EBS volumes
comprising 25% of our daily spend and 8% on snapshots.

![Cost Reduction](cost-recuction.png)

When we first started out on our move to the cloud we decided to create a simple CLI app for users. This app talks to a
server that performs all the AWS API calls and tracks instance state and metadata. In the beginning we focused on the
basics: create, stop, start and terminate. This gave us good fundamental knowledge about how AWS and EC2 worked. We also
added an automatic shutdown of any instance that was online at 7 PM to keep initial costs under control.

As usage of our service grew we started analyzing what the majority of our cost was going to. Turns out that over 70% of
our cost was due to [EBS volume](https://aws.amazon.com/ebs/features/) space. This is because of two main reasons:

1. Databases running on EC2 needed anywhere form 30 to 900 GB of volume space
2. Users create a new database, use it once and let it sit around offline for months

To begin reducing our EBS usage we decided to snapshot each database as it was shutdown. Because we would be deleting
and creating volumes whatever we did needed to be robust. We considered writing our own implementation but discovered an
Amazon service that fit the bill.

_Sample code and services refrenced in this post are available on
[Github](https://github.com/powercosts/ebs-sf-example)._

## AWS Step Functions

[Step Functions](https://aws.amazon.com/step-functions/features/) enable coordination of multiple AWS services into a
serverless workflow. Step Functions are built out of [task, choice and wait
states](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-states.html) to control your workflow. Coca-Cola
gave [a great talk at re:Invent 2017](https://youtu.be/sMaqd5J69Ns?t=502) on how they use Step Functions for creating
nutrition labels.

Our Step Functions are chains of [AWS Lambda](https://aws.amazon.com/lambda/features/) functions that call the AWS EC2
API. These Step Functions shutdown an instance and convert its EBS volumes to snapshots. Because Step Functions include
a wait and choice state this enables easy looping. Instead of waiting inside a Lambda function for a snapshot to
complete we output the current status into the Step Function state. Then we check that output and verify that the action
was successful. If it wasn't then we wait for a period of time and loop back to the check status function. If it was
successful we go to the next step in the workflow.

`gist:chadjvw/21c61b092767562b4fcb42d7f5ee1653#step-function-wait-loop.yml`

|Stop Step Function|Start Step Function|
|---|---|
[![Stop Step Function](stop-step-function-small.png)](stop-step-function.png) | [![Start Step Function](start-step-function-small.png)](start-step-function.png)

## Drawbacks

There are some drawbacks to this approach. First, there is a known performance degradation of volumes created from
snapshots. When you create a new volume from a snapshot AWS loads the blocks from S3 as operating system is requests
them. This can cause degrade performance until the volume has received all its blocks from S3. [Amazon has a recommended
solution](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-initialize.html) if this is a concern for you. Second,
increased startup and shutdown time. Typical EC2 startup and shutdown time is a few minutes. Our shutdown and startup
process takes about 7 minutes each way.

## Other Considerations

One thing to keep in mind when designing a Step Function is secure loop iteration. If you have an array of objects that
need an action performed on them only once you need a secure way to do so. The pattern we follow is to:

1. have the actor Lambda function take in the array and an index value to act upon
2. Actor Lambda performs work on that index element of the array
3. Iterator Lambda increments the index after the actor Lambda completes
4. Choice state completes the loop or sends it back to step 1 if there are more elements in the array

This allows you to handle a single array element failure instead of trying to handle the entire array. A great example
is detaching volumes from an instance. If you have 2 volumes and only 1 detaches on the first call Amazon will throw an
error if you repeat the exact same call. We have identified several key API calls that need this pattern:

* Creating volumes
* Detaching volumes
* Attaching volumes
* Creating snapshots

Amazon has [a great example in the Step Function
docs](https://docs.aws.amazon.com/step-functions/latest/dg/tutorial-create-iterate-pattern-section.html#create-iterate-pattern-step-1)
on how to do this. You can view our own Iterator lambda
[here](https://github.com/powercosts/ebs-sf-example/blob/master/src/functions/iterate.ts) and see it in action below.

`gist:chadjvw/21c61b092767562b4fcb42d7f5ee1653#step-function-iterator.yml`

Another great feature of Step Functions is the Retry block. Amazon's SDK retires API calls that received a throttled
error code. During times of increased API activity we get throttled more than the SDK can handle. AWS recommends that
you wrap API calls in an [error retry and exponential
backoff](https://docs.aws.amazon.com/general/latest/gr/api-retries.html) pattern. The Retry block handles this situation
without having to write your own implementation.

Here is a list of the various exception names that we have discovered through trial and error. These cover the various
throttling exceptions in the EC2 and EBS APIs.

`gist:chadjvw/21c61b092767562b4fcb42d7f5ee1653#step-function-retry.yml`

## Final Thoughts

Our next goal is to split our current Step Functions into small composable actions. This will allow us to string actions
together via a meta "Runner" Step Function. The Runner function will execute a child "Action" Step Function and watch
its progress. Once the first action is complete it will start the next action with the output of the previous action.
Using this pattern will also mean that we should be able to regression test all our actions via the Runner.

I hope you have enjoyed this blog post and learned something along the way. Reach out to me on Twitter at
[@chadjvw](https://twitter.com/chadjvw) if you have any questions and I'd be happy to answer them.
