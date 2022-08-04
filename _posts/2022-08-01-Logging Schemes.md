---
layout: post
title: Logging Schemes 日志管理策略
modified: 4/8/2022, 13:55:24
tags: [database, chinese, note]
comments: true
category: blog
---

# Logging Schemes 日志管理策略

## Crash Recovery

恢复的策略主要分两种:

* transaction进行中保证DBMS能够从错误中恢复
* 在错误发生之后去恢复DBMS的atomicity, consistency and durability

在恢复的算法中主要考虑: 

* UNDO: 移除未完成或者废除的transaction->The process of removing the effects of an incomplete or aborted transaction
* REDO: re-instate已经commit的transaction->The process of re-instating the effects of a committed transaction for durability
* [这里讲InnoDB的Dirty page和Redo Log](https://www.cnblogs.com/Arlen/articles/1768557.html)

## Failure Classification

## Buffer Pool Management Policies

### Steal Policy

是否允许一个uncommitted的tx将修改更新到磁盘

* STEAL: 磁盘中可能出现uncommitted的数据，因此系统需要记录undo log，防止tx abort的时候进行rollback
* NO-STEAL: 磁盘中不会存在uncommitted的数据，无需rollback，也无需记录undo log

### Force Policy

tx在commit之后是否必须将所有更新立刻持久化到磁盘

> Whether the DBMS ensures that all updates made by a transaction are reflected on nonvolatile storage before the transaction is allowed to commit.

* FORCE: 容易导致磁盘发生很多写操作，更可能是随机写
  * 较为容易恢复，但是poor runtime performance
* NO-FORCE: tx在commit之后可以不立即持久化到磁盘，可以缓存很多的batches，降低磁盘的操作次数，提升顺序写
  * 如果commit之后发生crash，那么此时已经commit的数据将会丢失，因此需要记录redo log，并且在系统重启前进行roll-forward的操作

---

其中一种比较简单的是**NO-STEAL+FORCE**

* DBMS不会对aborted transaction进行undo changes，因为changes没有被写入到disk中
* DBMS不会对已经commit的transaction进行redo changes，因为所有的changes都在commit的时候被写入到了disk中
* 如果transaction需要修改的data does not fit on memory，那么tx不能execute，因为DBMS不允许在transaction commit之前写出dirty pages到disk中

## Shadow Paging

> NO-STEAL+FORCE

有两份database的副本:

* Master: 只包含来自已提交事务的改变
* Shadow: 一个临时的包含未提交事务的改变的database

事务只在shadow copy中进行更新，当一个事务提交时，会将shadow转换为新的master

shadow page直到修改完毕才被激活，保证了atomicity

## Write-Ahead Logging

> 预写日志，保证数据操作的atomicity and durality
>
> 修改并不会直接写入数据库文件中，而是写入到另一个称为WAL的文件中。
>
> 如果事务失败，WAL中的记录会被忽略，撤销修改；如果事务成功过，它将在随后的某个事件被写回数据库文件中，提交修改。
>
> STEAL+NO-FORCE

WAL has the fastest runtime performance, but recovery time is slower than shadow paging (replay the log)

* 在页面本身被允许在非易失性存储中覆盖之前，与更新页面有关的所有日志记录都被写入非易失性存储->log records先写入
* 在所有日志记录都写入数据库文件中之前，不会认为事务已提交
* `<BEGIN>` & `<COMMIT>`
* 每个log entry都包含有关于单个对象的更改信息
  * Transaction ID
  * Object ID
  * Before value (used for UNDO)
  * After value (used for REDO)
* tx提交时将log entries写入disk，可以使用group commit将多个log一起批处理

### Checkpoints

log file会越来越大，如果crash发生，DBMS需要重启整个log

checkpoints可以同步WAL文件和数据库文件，一般在WAL文件积累到一定页数修改的时候，或者可以手动执行checkpoints

* DBMS会停止接收新的事务，并且会等到所有active事务运行完毕
* 将memory里的log records和dirty blocks都刷到数据库文件中
* 在log最后 `<CHECKPOINT>`，并且写入数据库文件

## Logging Schemes

* Physical Logging
* Logical Logging
* Physiological Logging
